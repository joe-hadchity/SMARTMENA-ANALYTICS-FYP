const { getSupabase } = require("../../config/supabase");
const contextService = require("./competitorContextService");
const normalizer = require("./competitorNormalizerService");
const braveAdapter = require("./discoveryAdapters/braveCompetitorAdapter");
const {
  isValidHandle,
  normalizeHandle,
  profileUrlFor,
} = require("./competitorTextUtils");

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.status = 503;
    throw err;
  }
  return supabase;
}

function wrapSchemaError(error) {
  if (isCandidateSchemaMissing(error)) {
    const err = new Error(
      "Competitor schema is not applied. Run backend/db/schema_v10.sql and backend/db/schema_v13.sql in Supabase.",
    );
    err.status = 503;
    err.details = { code: "competitor_schema_missing" };
    return err;
  }
  const err = new Error(error?.message || "Competitor database error");
  err.status = error?.code === "23505" ? 409 : 400;
  err.details = { code: error?.code, hint: error?.hint };
  return err;
}

function isCandidateSchemaMissing(error) {
  return error?.code === "42P01" || /competitor_candidates/i.test(error?.message || "");
}

async function listApproved(workspaceId, { includeInactive = false, platform } = {}) {
  const supabase = requireClient();
  let query = supabase
    .from("competitor_accounts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (!includeInactive) query = query.eq("is_active", true);
  if (platform) query = query.eq("platform", platform);
  query = query.neq("source", "mock");
  query = query.not("profile_url", "is", null);

  const { data, error } = await query;
  if (error) throw wrapSchemaError(error);

  const rows = data || [];
  const snapshotMap = await latestSnapshots(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    latest_snapshot: snapshotMap.get(row.id) || null,
  }));
}

async function listCandidates(workspaceId, { status = "pending", limit = 50 } = {}) {
  const supabase = requireClient();
  let query = supabase
    .from("competitor_candidates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("relevance_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    if (isCandidateSchemaMissing(error)) {
      return listAccountBackedCandidates(workspaceId, { status, limit });
    }
    throw wrapSchemaError(error);
  }
  return (data || []).map((row) => ({ ...row, _storage: "candidate_table" }));
}

async function discover(workspaceId, input = {}) {
  const context = await contextService.buildContext(workspaceId, input);
  const adapterResult = await braveAdapter.discover({
    context,
    limit: input.limit || 12,
  });
  const normalized = normalizer
    .normalizeCandidates(adapterResult.candidates, context)
    .filter((candidate) => candidate.relevance_score >= 18)
    .slice(0, input.limit || 12);
  const saved = await upsertCandidates(workspaceId, normalized);

  return {
    generated_at: new Date().toISOString(),
    source: "brave_search",
    real_data_only: true,
    context,
    candidates: saved,
    warnings: adapterResult.warnings || [],
  };
}

async function manualAdd(workspaceId, input = {}) {
  const platform = input.platform || "meta_instagram";
  const handle = normalizeHandle(input.handle || input.profile_url);
  if (!isValidHandle(handle, platform)) {
    const err = new Error("Enter a valid username or profile URL.");
    err.status = 400;
    throw err;
  }

  const context = await contextService.buildContext(workspaceId, {
    platform,
    category: input.industry,
    location: input.region,
    keywords: input.tags,
  });
  const verification = await braveAdapter.verifyHandle({ platform, handle, context });
  if (!verification.verified) {
    const err = new Error("Could not verify this public profile from search evidence.");
    err.status = 422;
    err.details = {
      warnings: verification.warnings,
      hint: "Check the username/page name or try pasting the full profile URL.",
    };
    throw err;
  }

  const candidate = normalizer.normalizeCandidate(
    {
      platform,
      handle,
      display_name: input.display_name || verification.evidence[0]?.display_name || handle,
      profile_url: input.profile_url || profileUrlFor(platform, handle),
      region: input.region || context.location || null,
      industry: input.industry || context.category || null,
      tags: input.tags || context.hashtags || [],
      source: "manual",
      evidence: verification.evidence.flatMap((item) => item.evidence || []),
      raw_payload: { verification },
      metrics: verification.evidence[0]?.metrics || {},
    },
    context,
  );
  const [saved] = await upsertCandidates(workspaceId, [candidate]);
  const approved = await approveCandidate(workspaceId, saved.id);
  return {
    competitor: approved.competitor,
    candidate: approved.candidate,
    warnings: verification.warnings || [],
  };
}

async function approveCandidate(workspaceId, candidateId) {
  const supabase = requireClient();
  const candidate = await getCandidate(workspaceId, candidateId);

  if (candidate._storage === "account_candidate") {
    const { data: competitor, error } = await supabase
      .from("competitor_accounts")
      .update({
        is_active: true,
        metadata: {
          ...(candidate.metadata || {}),
          competitor_candidate: {
            ...((candidate.metadata || {}).competitor_candidate || {}),
            status: "approved",
          },
          approved_from: candidate.source,
          confidence: candidate.confidence,
          rationale: candidate.rationale,
          evidence: candidate.evidence_json || [],
        },
      })
      .eq("id", candidate.id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw wrapSchemaError(error);
    await captureAccountSnapshot(competitor, candidate);
    return {
      competitor,
      candidate: {
        ...candidate,
        status: "approved",
        approved_competitor_id: competitor.id,
      },
    };
  }

  const accountPayload = {
    workspace_id: workspaceId,
    platform: candidate.platform,
    handle: candidate.handle,
    display_name: candidate.display_name,
    avatar_url: candidate.avatar_url,
    profile_url: candidate.profile_url,
    region: candidate.region,
    industry: candidate.industry,
    tags: candidate.tags || [],
    source: "manual",
    is_active: true,
    metadata: {
      approved_from: candidate.source,
      candidate_id: candidate.id,
      confidence: candidate.confidence,
      rationale: candidate.rationale,
      evidence: candidate.evidence_json || [],
      raw_payload: candidate.raw_payload_json || {},
    },
  };

  const { data: competitor, error } = await supabase
    .from("competitor_accounts")
    .upsert(accountPayload, { onConflict: "workspace_id,platform,handle" })
    .select()
    .single();
  if (error) throw wrapSchemaError(error);

  await updateCandidate(candidate.id, {
    status: "approved",
    approved_competitor_id: competitor.id,
  });
  await captureAccountSnapshot(competitor, candidate);

  return {
    competitor,
    candidate: {
      ...candidate,
      status: "approved",
      approved_competitor_id: competitor.id,
    },
  };
}

async function rejectCandidate(workspaceId, candidateId) {
  const candidate = await getCandidate(workspaceId, candidateId);
  return updateCandidate(candidate.id, { status: "rejected" });
}

async function removeCompetitor(workspaceId, competitorId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("competitor_accounts")
    .update({ is_active: false })
    .eq("id", competitorId)
    .eq("workspace_id", workspaceId)
    .select()
    .maybeSingle();
  if (error) throw wrapSchemaError(error);
  if (!data) {
    const err = new Error("Competitor not found");
    err.status = 404;
    throw err;
  }
  return data;
}

async function refreshCompetitor(workspaceId, competitorId) {
  const supabase = requireClient();
  const { data: competitor, error } = await supabase
    .from("competitor_accounts")
    .select("*")
    .eq("id", competitorId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw wrapSchemaError(error);
  if (!competitor) {
    const err = new Error("Competitor not found");
    err.status = 404;
    throw err;
  }

  const context = await contextService.buildContext(workspaceId, {
    platform: competitor.platform,
    category: competitor.industry,
    location: competitor.region,
    keywords: competitor.tags,
  });
  const verification = await braveAdapter.verifyHandle({
    platform: competitor.platform,
    handle: competitor.handle,
    context,
  });
  const evidence = verification.evidence.flatMap((item) => item.evidence || []);
  const candidateLike = {
    evidence_json: evidence,
    raw_payload_json: { verification },
  };
  const snapshot = await captureAccountSnapshot(competitor, candidateLike);
  const { data: updated, error: updateError } = await supabase
    .from("competitor_accounts")
    .update({
      last_scraped_at: new Date().toISOString(),
      metadata: {
        ...(competitor.metadata || {}),
        last_verification: {
          verified: verification.verified,
          evidence_count: evidence.length,
          warnings: verification.warnings || [],
        },
      },
    })
    .eq("id", competitor.id)
    .select()
    .single();
  if (updateError) throw wrapSchemaError(updateError);
  return {
    competitor: updated,
    snapshot,
    warnings: verification.warnings || [],
  };
}

async function upsertCandidates(workspaceId, candidates) {
  if (!candidates.length) return [];
  const supabase = requireClient();
  const payload = candidates.map((candidate) => ({
    workspace_id: workspaceId,
    ...candidate,
    status: "pending",
  }));
  const { data, error } = await supabase
    .from("competitor_candidates")
    .upsert(payload, { onConflict: "workspace_id,platform,handle" })
    .select()
    .order("relevance_score", { ascending: false });
  if (error) {
    if (isCandidateSchemaMissing(error)) {
      return upsertAccountBackedCandidates(workspaceId, candidates);
    }
    throw wrapSchemaError(error);
  }
  return (data || []).map((row) => ({ ...row, _storage: "candidate_table" }));
}

async function getCandidate(workspaceId, candidateId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("competitor_candidates")
    .select("*")
    .eq("id", candidateId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) {
    if (isCandidateSchemaMissing(error)) {
      return getAccountBackedCandidate(workspaceId, candidateId);
    }
    throw wrapSchemaError(error);
  }
  if (!data) {
    const err = new Error("Competitor candidate not found");
    err.status = 404;
    throw err;
  }
  return { ...data, _storage: "candidate_table" };
}

async function updateCandidate(candidateId, patch) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("competitor_candidates")
    .update(patch)
    .eq("id", candidateId)
    .select()
    .single();
  if (error) {
    if (isCandidateSchemaMissing(error)) {
      return updateAccountBackedCandidate(candidateId, patch);
    }
    throw wrapSchemaError(error);
  }
  return { ...data, _storage: "candidate_table" };
}

async function captureAccountSnapshot(competitor, candidate) {
  const supabase = requireClient();
  const followers =
    candidate?.raw_payload_json?.metrics?.followers_count ||
    candidate?.raw_payload_json?.raw_payload?.metrics?.followers_count ||
    null;
  const payload = {
    competitor_account_id: competitor.id,
    scope: "account",
    followers_count: Number.isFinite(Number(followers)) ? Number(followers) : null,
    metadata: {
      source: "public_profile_evidence",
      evidence: candidate?.evidence_json || [],
      raw_payload: candidate?.raw_payload_json || {},
    },
  };
  const { data, error } = await supabase
    .from("competitor_metrics_snapshots")
    .insert(payload)
    .select()
    .single();
  if (error) throw wrapSchemaError(error);
  return data;
}

async function latestSnapshots(accountIds) {
  if (!accountIds.length) return new Map();
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("competitor_metrics_snapshots")
    .select("*")
    .in("competitor_account_id", accountIds)
    .order("captured_at", { ascending: false });
  if (error) return new Map();
  const map = new Map();
  for (const row of data || []) {
    if (!map.has(row.competitor_account_id)) map.set(row.competitor_account_id, row);
  }
  return map;
}

async function listAccountBackedCandidates(workspaceId, { status = "pending", limit = 50 } = {}) {
  const supabase = requireClient();
  let query = supabase
    .from("competitor_accounts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", false)
    .order("created_at", { ascending: false })
    .limit(Math.max(limit, 100));

  const { data, error } = await query;
  if (error) throw wrapSchemaError(error);

  return (data || [])
    .map(accountToCandidate)
    .filter((candidate) => Boolean(candidate))
    .filter((candidate) => status === "all" || candidate.status === status)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}

async function upsertAccountBackedCandidates(workspaceId, candidates) {
  const supabase = requireClient();
  if (!candidates.length) return [];
  const payload = candidates.map((candidate) => ({
    workspace_id: workspaceId,
    platform: candidate.platform,
    handle: candidate.handle,
    display_name: candidate.display_name,
    avatar_url: candidate.avatar_url,
    profile_url: candidate.profile_url,
    region: candidate.region,
    industry: candidate.industry,
    tags: candidate.tags || [],
    source: "manual",
    is_active: false,
    metadata: {
      competitor_candidate: {
        source: candidate.source,
        status: "pending",
        relevance_score: candidate.relevance_score,
        confidence: candidate.confidence,
        rationale: candidate.rationale,
        signals: candidate.signals || [],
        evidence_json: candidate.evidence_json || [],
        raw_payload_json: candidate.raw_payload_json || {},
      },
    },
  }));

  const { data, error } = await supabase
    .from("competitor_accounts")
    .upsert(payload, { onConflict: "workspace_id,platform,handle" })
    .select();
  if (error) throw wrapSchemaError(error);
  return (data || []).map(accountToCandidate).filter(Boolean);
}

async function getAccountBackedCandidate(workspaceId, candidateId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("competitor_accounts")
    .select("*")
    .eq("id", candidateId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw wrapSchemaError(error);
  const candidate = accountToCandidate(data);
  if (!candidate) {
    const err = new Error("Competitor candidate not found");
    err.status = 404;
    throw err;
  }
  return candidate;
}

async function updateAccountBackedCandidate(candidateId, patch) {
  const supabase = requireClient();
  const { data: existing, error: readError } = await supabase
    .from("competitor_accounts")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();
  if (readError) throw wrapSchemaError(readError);
  const current = existing?.metadata?.competitor_candidate || {};
  const nextCandidate = {
    ...current,
    status: patch.status || current.status || "pending",
    approved_competitor_id: patch.approved_competitor_id || current.approved_competitor_id || null,
  };
  const { data, error } = await supabase
    .from("competitor_accounts")
    .update({
      metadata: {
        ...(existing?.metadata || {}),
        competitor_candidate: nextCandidate,
      },
    })
    .eq("id", candidateId)
    .select()
    .single();
  if (error) throw wrapSchemaError(error);
  return accountToCandidate(data);
}

function accountToCandidate(row) {
  if (!row?.metadata?.competitor_candidate) return null;
  const meta = row.metadata.competitor_candidate;
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    platform: row.platform,
    handle: row.handle,
    display_name: row.display_name,
    profile_url: row.profile_url,
    avatar_url: row.avatar_url,
    region: row.region,
    industry: row.industry,
    tags: row.tags || [],
    source: meta.source || "web_search",
    status: meta.status || "pending",
    relevance_score: Number(meta.relevance_score || 0),
    confidence: Number(meta.confidence || 0),
    rationale: meta.rationale || null,
    signals: meta.signals || [],
    evidence_json: meta.evidence_json || [],
    raw_payload_json: meta.raw_payload_json || {},
    approved_competitor_id: meta.approved_competitor_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: row.metadata || {},
    _storage: "account_candidate",
  };
}

async function summary(workspaceId) {
  const [approved, pending, rejected] = await Promise.all([
    listApproved(workspaceId),
    listCandidates(workspaceId, { status: "pending", limit: 100 }),
    listCandidates(workspaceId, { status: "rejected", limit: 100 }),
  ]);
  return {
    approved_count: approved.length,
    pending_count: pending.length,
    rejected_count: rejected.length,
    approved,
    pending,
  };
}

async function comparison(workspaceId, { window_days: windowDays = 30 } = {}) {
  const supabase = requireClient();
  const windowDaysNumber = Number(windowDays) || 30;
  const since = new Date(Date.now() - windowDaysNumber * 24 * 60 * 60 * 1000).toISOString();
  const [ownPosts, competitorRows] = await Promise.all([
    loadOwnComparisonPosts(supabase, workspaceId, since),
    loadCompetitorComparisonRows(supabase, workspaceId, since),
  ]);

  const own = summarizeRows(ownPosts, { label: "You" });
  const competitors = competitorRows
    .map((group) => ({
      competitor_id: group.account.id,
      handle: group.account.handle,
      display_name: group.account.display_name,
      platform: group.account.platform,
      profile_url: group.account.profile_url,
      latest_snapshot: group.account.latest_snapshot || null,
      followers_count: group.account.latest_snapshot?.followers_count || null,
      evidence_count: competitorEvidenceCount(group.account),
      evidence_sources: competitorEvidenceSources(group.account),
      last_scraped_at: group.account.last_scraped_at || null,
      ...summarizeRows(group.posts, { label: group.account.handle }),
    }))
    .sort((a, b) => competitorRankScore(b) - competitorRankScore(a));
  const competitorSummary = summarizeRows(
    competitorRows.flatMap((group) => group.posts),
    { label: "Competitors" },
  );
  const bestCompetitor = competitors[0] || null;
  const benchmark = buildBenchmark({
    own,
    competitorSummary,
    competitors,
    windowDays: windowDaysNumber,
  });

  return {
    generated_at: new Date().toISOString(),
    window_days: windowDaysNumber,
    own,
    competitors_summary: {
      ...competitorSummary,
      competitor_count: competitors.length,
      best_competitor_handle: bestCompetitor?.handle || null,
      followers_count: sumNumbers(competitors.map((row) => row.followers_count)),
      avg_followers:
        competitors.filter((row) => row.followers_count != null).length > 0
          ? Math.round(
              sumNumbers(competitors.map((row) => row.followers_count)) /
                competitors.filter((row) => row.followers_count != null).length,
            )
          : null,
      evidence_count: sumNumbers(competitors.map((row) => row.evidence_count)),
      accounts_with_posts: competitors.filter((row) => row.post_count > 0).length,
      accounts_with_snapshots: competitors.filter((row) => row.latest_snapshot).length,
      top_format: topFormat(competitorSummary.format_mix),
      top_format_share: topFormatShare(competitorSummary.format_mix),
    },
    competitors,
    deltas: {
      engagement_rate_delta:
        own.avg_engagement_rate != null && competitorSummary.avg_engagement_rate != null
          ? Number((own.avg_engagement_rate - competitorSummary.avg_engagement_rate).toFixed(5))
          : null,
      post_count_delta: own.post_count - competitorSummary.post_count,
      engagement_total_delta: own.total_engagement - competitorSummary.total_engagement,
    },
    benchmark,
    opportunities: comparisonOpportunities(own, competitorSummary, competitors, benchmark),
    recommendations: comparisonRecommendations(own, competitorSummary, bestCompetitor),
    warnings: [
      ...(own.post_count ? [] : ["own_posts_empty:no_recent_synced_posts"]),
      ...(competitors.length ? [] : ["competitors_empty:no_approved_competitors"]),
      ...(competitorSummary.post_count ? [] : ["competitor_posts_empty:no_recent_competitor_posts"]),
    ],
  };
}

async function loadOwnComparisonPosts(supabase, workspaceId, since) {
  const [synced, social] = await Promise.all([
    loadSyncedOwnPosts(supabase, workspaceId, since),
    loadSocialOwnPosts(supabase, workspaceId, since),
  ]);
  return [...synced, ...social];
}

async function loadSyncedOwnPosts(supabase, workspaceId, since) {
  const { data: posts, error } = await supabase
    .from("synced_posts")
    .select("id, post_type, caption, permalink, posted_at, fetched_at")
    .eq("workspace_id", workspaceId)
    .gte("posted_at", since)
    .order("posted_at", { ascending: false })
    .limit(500);
  if (error || !posts?.length) return [];

  const metrics = await latestPostMetrics(supabase, "post_metrics", "synced_post_id", posts.map((p) => p.id));
  return posts.map((post) =>
    comparisonRow({
      id: post.id,
      source: "own_synced_posts",
      media_type: post.post_type,
      caption: post.caption,
      url: post.permalink,
      published_at: post.posted_at || post.fetched_at,
      metrics: metrics.get(post.id) || {},
    }),
  );
}

async function loadSocialOwnPosts(supabase, workspaceId, since) {
  const { data: accounts, error: accountError } = await supabase
    .from("social_accounts")
    .select("id, provider, handle, display_name")
    .eq("workspace_id", workspaceId);
  if (accountError || !accounts?.length) return [];

  const accountIds = accounts.map((account) => account.id);
  const { data: posts, error } = await supabase
    .from("social_posts")
    .select("id, social_account_id, caption, media_type, permalink, published_at, created_at")
    .in("social_account_id", accountIds)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(500);
  if (error || !posts?.length) return [];

  const metrics = await latestPostMetrics(
    supabase,
    "post_metrics_snapshots",
    "social_post_id",
    posts.map((p) => p.id),
    "snapshot_time",
  );
  return posts.map((post) =>
    comparisonRow({
      id: post.id,
      source: "own_social_posts",
      media_type: post.media_type,
      caption: post.caption,
      url: post.permalink,
      published_at: post.published_at || post.created_at,
      metrics: metrics.get(post.id) || {},
    }),
  );
}

async function loadCompetitorComparisonRows(supabase, workspaceId, since) {
  const accounts = await listApproved(workspaceId);
  if (!accounts.length) return [];
  const accountIds = accounts.map((account) => account.id);
  const { data: posts, error } = await supabase
    .from("competitor_posts")
    .select("*")
    .in("competitor_account_id", accountIds)
    .gte("posted_at", since)
    .order("posted_at", { ascending: false })
    .limit(1000);
  if (error) return accounts.map((account) => ({ account, posts: [] }));

  const metrics = await latestPostMetrics(
    supabase,
    "competitor_metrics_snapshots",
    "competitor_post_id",
    (posts || []).map((post) => post.id),
  );
  const grouped = new Map(accounts.map((account) => [account.id, { account, posts: [] }]));
  for (const post of posts || []) {
    const group = grouped.get(post.competitor_account_id);
    if (!group) continue;
    group.posts.push(
      comparisonRow({
        id: post.id,
        source: "competitor_posts",
        media_type: post.media_type,
        caption: post.caption,
        url: post.permalink,
        published_at: post.posted_at || post.fetched_at,
        metrics: metrics.get(post.id) || {},
      }),
    );
  }
  return [...grouped.values()];
}

async function latestPostMetrics(
  supabase,
  table,
  keyColumn,
  postIds,
  timeColumn = "captured_at",
) {
  if (!postIds.length) return new Map();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .in(keyColumn, postIds)
    .order(timeColumn, { ascending: false });
  if (error) return new Map();
  const byPost = new Map();
  for (const row of data || []) {
    const key = row[keyColumn];
    if (byPost.has(key)) continue;
    byPost.set(key, normalizeMetrics(row));
  }
  return byPost;
}

function comparisonRow({ id, source, media_type, caption, url, published_at, metrics }) {
  const normalized = normalizeMetrics(metrics || {});
  return {
    id,
    source,
    media_type: media_type || "unknown",
    caption: caption || null,
    url: url || null,
    published_at: published_at || null,
    metrics: normalized,
    engagement_total: engagementTotal(normalized),
  };
}

function normalizeMetrics(metrics = {}) {
  return {
    followers_count: nullableNumber(metrics.followers_count),
    likes: numberOrZero(metrics.likes),
    comments: numberOrZero(metrics.comments),
    shares: numberOrZero(metrics.shares),
    saves: numberOrZero(metrics.saves),
    impressions: numberOrZero(metrics.impressions),
    reach: numberOrZero(metrics.reach),
    video_views: numberOrZero(metrics.video_views),
    engagement_rate: nullableNumber(metrics.engagement_rate),
    captured_at: metrics.captured_at || metrics.snapshot_time || null,
  };
}

function summarizeRows(rows, { label }) {
  const list = rows || [];
  const totals = list.reduce(
    (acc, row) => {
      acc.engagement += row.engagement_total || 0;
      acc.reach += row.metrics?.reach || 0;
      acc.impressions += row.metrics?.impressions || 0;
      acc.video_views += row.metrics?.video_views || 0;
      acc.caption_words += extractKeywords(row.caption).length;
      if (row.metrics?.engagement_rate != null) {
        acc.engagementRateSum += Number(row.metrics.engagement_rate);
        acc.engagementRateCount += 1;
      }
      acc.format_mix[row.media_type || "unknown"] =
        (acc.format_mix[row.media_type || "unknown"] || 0) + 1;
      return acc;
    },
    {
      engagement: 0,
      reach: 0,
      impressions: 0,
      video_views: 0,
      caption_words: 0,
      engagementRateSum: 0,
      engagementRateCount: 0,
      format_mix: {},
    },
  );
  const topPost = [...list].sort((a, b) => b.engagement_total - a.engagement_total)[0] || null;
  return {
    label,
    post_count: list.length,
    total_engagement: totals.engagement,
    total_reach: totals.reach,
    total_impressions: totals.impressions,
    total_video_views: totals.video_views,
    avg_engagement_rate:
      totals.engagementRateCount > 0
        ? Number((totals.engagementRateSum / totals.engagementRateCount).toFixed(5))
        : null,
    avg_engagement_per_post:
      list.length > 0 ? Number((totals.engagement / list.length).toFixed(2)) : 0,
    avg_posts_per_week: postsPerWeek(list),
    avg_caption_keywords:
      list.length > 0 ? Number((totals.caption_words / list.length).toFixed(1)) : 0,
    format_mix: totals.format_mix,
    top_format: topFormat(totals.format_mix),
    top_format_share: topFormatShare(totals.format_mix),
    keyword_mix: keywordMix(list),
    top_post: topPost
      ? {
          caption: topPost.caption,
          url: topPost.url,
          media_type: topPost.media_type,
          published_at: topPost.published_at,
          engagement_total: topPost.engagement_total,
          engagement_rate: topPost.metrics?.engagement_rate ?? null,
        }
      : null,
  };
}

function buildBenchmark({ own, competitorSummary, competitors, windowDays }) {
  const ownRate = own.avg_engagement_rate;
  const competitorRate = competitorSummary.avg_engagement_rate;
  const engagementWinner =
    ownRate == null || competitorRate == null
      ? "insufficient_data"
      : ownRate >= competitorRate
        ? "you"
        : "competitors";
  const outputWinner =
    own.post_count === competitorSummary.post_count
      ? "tied"
      : own.post_count > competitorSummary.post_count
        ? "you"
        : "competitors";
  const ownTop = own.top_format;
  const competitorTop = competitorSummary.top_format;
  const formatGap =
    ownTop && competitorTop && ownTop !== competitorTop
      ? {
          own_top_format: ownTop,
          competitor_top_format: competitorTop,
          message: `Your mix leads with ${ownTop}, while competitors lead with ${competitorTop}.`,
        }
      : {
          own_top_format: ownTop,
          competitor_top_format: competitorTop,
          message: ownTop
            ? `Both sides show similar reliance on ${ownTop}.`
            : "Format data is still thin.",
        };

  const evidenceCount = sumNumbers(competitors.map((row) => row.evidence_count));
  const accountsWithPosts = competitors.filter((row) => row.post_count > 0).length;
  const accountsWithSnapshots = competitors.filter((row) => row.latest_snapshot).length;
  const qualityScore = Math.min(
    100,
    Math.round(
      (own.post_count ? 25 : 0) +
        (competitors.length ? 20 : 0) +
        Math.min(25, accountsWithPosts * 8) +
        Math.min(20, evidenceCount * 3) +
        Math.min(10, accountsWithSnapshots * 5),
    ),
  );

  return {
    window_days: windowDays,
    engagement_winner: engagementWinner,
    output_winner: outputWinner,
    engagement_rate_gap:
      ownRate != null && competitorRate != null
        ? Number((ownRate - competitorRate).toFixed(5))
        : null,
    output_gap_posts: own.post_count - competitorSummary.post_count,
    format_gap: formatGap,
    data_quality_score: qualityScore,
    data_quality_label:
      qualityScore >= 70 ? "strong" : qualityScore >= 40 ? "usable" : "thin",
    evidence_coverage: {
      approved_competitors: competitors.length,
      competitors_with_posts: accountsWithPosts,
      competitors_with_snapshots: accountsWithSnapshots,
      public_evidence_items: evidenceCount,
    },
    best_benchmark: competitors[0]
      ? {
          handle: competitors[0].handle,
          display_name: competitors[0].display_name,
          reason:
            competitors[0].post_count > 0
              ? "highest combined engagement and post benchmark score"
              : "strongest public profile evidence available",
        }
      : null,
  };
}

function comparisonOpportunities(own, competitorSummary, competitors, benchmark) {
  const items = [];
  if (benchmark.data_quality_label === "thin") {
    items.push({
      type: "data_quality",
      priority: "high",
      title: "Improve comparison evidence",
      detail:
        "Refresh approved competitors and sync your own account so the benchmark is based on recent posts, not only profile evidence.",
    });
  }
  if (benchmark.engagement_winner === "competitors") {
    items.push({
      type: "engagement_gap",
      priority: "high",
      title: "Close the engagement gap",
      detail: "Competitors are ahead on average engagement rate. Review their leading format and top post angle before the next campaign.",
    });
  } else if (benchmark.engagement_winner === "you") {
    items.push({
      type: "advantage",
      priority: "medium",
      title: "Protect your engagement lead",
      detail: "Your average engagement rate is ahead in this window. Reuse your strongest post structure while testing competitor formats.",
    });
  }
  if (benchmark.format_gap?.own_top_format && benchmark.format_gap?.competitor_top_format) {
    items.push({
      type: "format_mix",
      priority: "medium",
      title: "Test the competitor-led format",
      detail: benchmark.format_gap.message,
    });
  }
  const leader = competitors[0];
  if (leader?.handle) {
    items.push({
      type: "benchmark_account",
      priority: "medium",
      title: `Watch @${leader.handle}`,
      detail: leader.top_post?.caption
        ? `Their top evidence is: "${truncate(leader.top_post.caption, 120)}"`
        : "Use this profile as the closest public benchmark in the current competitor set.",
    });
  }
  if (!own.post_count) {
    items.push({
      type: "own_data",
      priority: "high",
      title: "Sync your own posts",
      detail: "Your side of the comparison is empty, so SmartMENA cannot calculate a reliable gap yet.",
    });
  }
  return items.slice(0, 5);
}

function comparisonRecommendations(own, competitorSummary, bestCompetitor) {
  const notes = [];
  if (!own.post_count) {
    notes.push("Sync your own social posts first so the comparison has your real performance baseline.");
  }
  if (!competitorSummary.post_count) {
    notes.push("Refresh approved competitors to capture recent public evidence before comparing content output.");
  }
  if (own.avg_engagement_rate != null && competitorSummary.avg_engagement_rate != null) {
    if (own.avg_engagement_rate >= competitorSummary.avg_engagement_rate) {
      notes.push("Your average engagement rate is above the approved competitor set for this window.");
    } else {
      notes.push("Competitors are ahead on average engagement rate; inspect their top format mix and posting cadence.");
    }
  }
  const ownTopFormat = topFormat(own.format_mix);
  const competitorTopFormat = topFormat(competitorSummary.format_mix);
  if (competitorTopFormat && competitorTopFormat !== ownTopFormat) {
    notes.push(`Competitors lean more on ${competitorTopFormat}; test that format against your current mix.`);
  }
  if (bestCompetitor?.handle) {
    notes.push(`Use @${bestCompetitor.handle} as the benchmark account for this comparison window.`);
  }
  return notes.slice(0, 5);
}

function competitorRankScore(row) {
  return (
    numberOrZero(row.avg_engagement_rate) * 100000 +
    numberOrZero(row.avg_engagement_per_post) * 0.1 +
    numberOrZero(row.followers_count) * 0.001 +
    numberOrZero(row.evidence_count)
  );
}

function competitorEvidenceCount(account = {}) {
  const evidence =
    account.metadata?.evidence ||
    account.metadata?.last_verification?.evidence ||
    account.metadata?.competitor_candidate?.evidence_json ||
    [];
  if (Array.isArray(evidence)) return evidence.length;
  return 0;
}

function competitorEvidenceSources(account = {}) {
  const evidence =
    account.metadata?.evidence ||
    account.metadata?.last_verification?.evidence ||
    account.metadata?.competitor_candidate?.evidence_json ||
    [];
  const counts = {};
  for (const item of Array.isArray(evidence) ? evidence : []) {
    const key = item.source || "public_web";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function topFormat(formatMix = {}) {
  return Object.entries(formatMix).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function topFormatShare(formatMix = {}) {
  const entries = Object.entries(formatMix);
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  if (!total) return 0;
  const top = entries.sort((a, b) => b[1] - a[1])[0];
  return Number((Number(top?.[1] || 0) / total).toFixed(3));
}

function postsPerWeek(rows) {
  const dates = (rows || [])
    .map((row) => (row.published_at ? new Date(row.published_at).getTime() : null))
    .filter((value) => Number.isFinite(value));
  if (!dates.length) return 0;
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const days = Math.max(7, (max - min) / (24 * 60 * 60 * 1000) + 1);
  return Number(((rows.length / days) * 7).toFixed(1));
}

function keywordMix(rows) {
  const counts = {};
  for (const row of rows || []) {
    for (const word of extractKeywords(row.caption)) {
      counts[word] = (counts[word] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

function extractKeywords(text) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "your",
    "our",
    "you",
    "are",
    "from",
    "next",
    "week",
    "today",
    "join",
  ]);
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9#]+/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^#/, ""))
    .filter((word) => word.length >= 4 && !stop.has(word))
    .slice(0, 30);
}

function sumNumbers(values) {
  return values.reduce((sum, value) => sum + numberOrZero(value), 0);
}

function truncate(text, max) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function engagementTotal(metrics = {}) {
  return (
    numberOrZero(metrics.likes) +
    numberOrZero(metrics.comments) +
    numberOrZero(metrics.shares) +
    numberOrZero(metrics.saves)
  );
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

module.exports = {
  approveCandidate,
  comparison,
  discover,
  listApproved,
  listCandidates,
  manualAdd,
  refreshCompetitor,
  rejectCandidate,
  removeCompetitor,
  summary,
};
