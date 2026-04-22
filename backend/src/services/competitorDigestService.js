/**
 * competitorDigestService -- weekly competitor digest pipeline.
 *
 * Pipeline:
 *
 *   1. Refresh every tracked competitor in the workspace (scrape + snapshot).
 *   2. Aggregate posts + engagement over the past 7 days into a structured
 *      summary object.
 *   3. Hand the summary to the LLM via `systemPrompts.competitorDigest`
 *      and parse the JSON response. Record token usage.
 *   4. Persist the full run in competitor_digest_runs and optionally push it
 *      to the configured email address (console stub for the beta).
 *
 * The pipeline is idempotent-safe for a given (workspace, day): calling it
 * twice on the same day just overwrites the previous narrative.
 */

const azure = require("./llm/azureOpenAIClient");
const systemPrompts = require("./llm/systemPrompts");
const usageMeter = require("./llm/usageMeter");
const { getSupabase } = require("../config/supabase");
const competitorService = require("./competitorService");
const competitorScraperService = require("./competitorScraperService");
const logger = require("../utils/logger");

const TABLE = "competitor_digest_runs";

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

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

async function listRuns(workspaceId, { limit = 10 } = {}) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    const err = new Error(error.message || "Failed to list digest runs");
    err.status = 500;
    throw err;
  }
  return data || [];
}

async function latestRun(workspaceId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    const err = new Error(error.message || "Failed to load digest run");
    err.status = 500;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

async function aggregateWorkspace(workspaceId, { windowDays = 7 } = {}) {
  const supabase = requireClient();
  const competitors = await competitorService.listCompetitors(workspaceId, {});
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();

  const aggregates = [];
  let totalPosts = 0;

  for (const c of competitors) {
    const { data: posts, error } = await supabase
      .from("competitor_posts")
      .select("id, caption, caption_lang, media_type, hashtags, posted_at, permalink")
      .eq("competitor_account_id", c.id)
      .gte("posted_at", since)
      .order("posted_at", { ascending: false })
      .limit(50);
    if (error) {
      logger.warn?.(`[competitorDigest] posts query failed: ${error.message}`);
      continue;
    }

    const postIds = (posts || []).map((p) => p.id);
    const snapshots = await competitorService.latestSnapshotForPosts(postIds);
    const snapById = new Map(
      snapshots.map((s) => [s.competitor_post_id, s]),
    );

    const withMetrics = (posts || []).map((p) => {
      const snap = snapById.get(p.id);
      const likes = snap?.likes || 0;
      const comments = snap?.comments || 0;
      const shares = snap?.shares || 0;
      const engagement = likes + comments + shares;
      return {
        id: p.id,
        caption: truncate(p.caption, 200),
        caption_lang: p.caption_lang,
        media_type: p.media_type,
        hashtags: (p.hashtags || []).slice(0, 5),
        posted_at: p.posted_at,
        permalink: p.permalink,
        likes,
        comments,
        shares,
        engagement_rate: snap?.engagement_rate ?? null,
        engagement_total: engagement,
      };
    });

    const mediaBreakdown = tallyBy(withMetrics, "media_type");
    const langBreakdown = tallyBy(withMetrics, "caption_lang");
    const avgEngagementRate = avg(
      withMetrics.map((p) => p.engagement_rate).filter((v) => v != null),
    );
    const topPost = [...withMetrics].sort(
      (a, b) => b.engagement_total - a.engagement_total,
    )[0];
    const accountSnap = await competitorService.latestAccountSnapshot(c.id);

    totalPosts += withMetrics.length;
    aggregates.push({
      competitor_id: c.id,
      handle: c.handle,
      display_name: c.display_name,
      platform: c.platform,
      region: c.region,
      industry: c.industry,
      post_count: withMetrics.length,
      followers_count: accountSnap?.followers_count ?? null,
      avg_engagement_rate: avgEngagementRate,
      media_breakdown: mediaBreakdown,
      language_breakdown: langBreakdown,
      top_post: topPost
        ? {
            caption: topPost.caption,
            permalink: topPost.permalink,
            media_type: topPost.media_type,
            posted_at: topPost.posted_at,
            engagement_total: topPost.engagement_total,
            caption_lang: topPost.caption_lang,
          }
        : null,
      hashtag_cloud: topHashtags(withMetrics),
    });
  }

  return {
    window_days: windowDays,
    generated_at: new Date().toISOString(),
    competitor_count: competitors.length,
    post_count: totalPosts,
    competitors: aggregates,
  };
}

function tallyBy(items, key) {
  const tally = {};
  for (const item of items) {
    const k = item[key] || "unknown";
    tally[k] = (tally[k] || 0) + 1;
  }
  return tally;
}

function avg(nums) {
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Number((sum / nums.length).toFixed(4));
}

function truncate(str, n) {
  if (!str) return str;
  if (str.length <= n) return str;
  return str.slice(0, n).trimEnd() + "…";
}

function topHashtags(posts) {
  const tally = {};
  for (const p of posts) {
    for (const h of p.hashtags || []) {
      tally[h] = (tally[h] || 0) + 1;
    }
  }
  return Object.entries(tally)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Narrative (Azure OpenAI, with structured fallback)
// ---------------------------------------------------------------------------

async function generateNarrative({ workspaceId, aggregate, locale = "en" }) {
  if (!azure.isEnabled()) {
    return {
      narrative: localFallback(aggregate),
      usage: null,
      model: null,
      source: "local",
    };
  }

  const prompt = systemPrompts.competitorDigest(aggregate, locale);
  try {
    const result = await azure.chat({
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content:
            "Produce the weekly competitor digest JSON per the schema above. Use only the aggregate provided.",
        },
      ],
      temperature: 0.3,
      maxTokens: 900,
      responseFormat: { type: "json_object" },
    });

    let parsed;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      parsed = localFallback(aggregate);
    }

    await usageMeter
      .recordUsage({
        workspaceId,
        feature: "competitor_digest",
        model: result.model,
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        costUSD: result.costUSD,
        metadata: { period_days: aggregate.window_days },
      })
      .catch((err) =>
        logger.warn?.(`[competitorDigest] usage insert failed: ${err.message}`),
      );

    return {
      narrative: parsed,
      usage: result.usage,
      model: result.model,
      source: "azure",
    };
  } catch (err) {
    logger.warn?.(`[competitorDigest] LLM call failed: ${err.message}`);
    return {
      narrative: localFallback(aggregate),
      usage: null,
      model: null,
      source: "local",
      warning: err.message,
    };
  }
}

function localFallback(aggregate) {
  const ranked = [...aggregate.competitors].sort(
    (a, b) => (b.post_count || 0) - (a.post_count || 0),
  );
  const top = ranked.slice(0, 3);
  const highlights = top.map((c) => ({
    competitor_handle: c.handle,
    headline_en: `${c.handle} posted ${c.post_count} time(s) this week on ${prettyPlatform(
      c.platform,
    )}.`,
    headline_ar: `نشر ${c.handle} ${c.post_count} مرة/مرات هذا الأسبوع على ${prettyPlatform(
      c.platform,
    )}.`,
    evidence: `${c.post_count} posts · followers ${c.followers_count ?? "n/a"}`,
  }));
  const total = aggregate.post_count;
  const summary_en = total
    ? `Your ${aggregate.competitor_count} tracked competitors published ${total} posts over the last ${aggregate.window_days} days.`
    : `No new competitor posts detected in the last ${aggregate.window_days} days.`;
  const summary_ar = total
    ? `نشر المنافسون الذين تتابعهم (${aggregate.competitor_count}) ما مجموعه ${total} منشور خلال آخر ${aggregate.window_days} أيام.`
    : `لم يتم رصد منشورات جديدة من المنافسين خلال آخر ${aggregate.window_days} أيام.`;
  return {
    summary_en,
    summary_ar,
    highlights,
    suggested_moves_en: [
      "Reply to trending hashtags used by top 3 competitors.",
      "Test Reel-first cadence if competitors are pushing Reels.",
      "Lean into Arabic-first captions where competitors skew English.",
    ],
    suggested_moves_ar: [
      "تفاعل مع الوسوم الأكثر استخدامًا عند المنافسين الثلاثة الأوائل.",
      "جرّب نشر الريلز إذا كان المنافسون يكثرون منها.",
      "ركّز على المحتوى العربي عندما يطغى الإنكليزي على المنافسين.",
    ],
  };
}

function prettyPlatform(p) {
  if (p === "meta_instagram") return "Instagram";
  if (p === "meta_facebook") return "Facebook";
  if (p === "tiktok") return "TikTok";
  if (p === "x") return "X";
  return p;
}

// ---------------------------------------------------------------------------
// Delivery (email stub)
// ---------------------------------------------------------------------------

async function deliverDigest({ run, target }) {
  if (!target) {
    return { delivery_status: "skipped", delivery_message: "No target configured." };
  }
  // Real integration (SendGrid / Resend) lands in a follow-up. For the beta
  // we log + record a pending delivery so the UI can show "sent".
  logger.info(
    `[competitorDigest] would email digest run ${run.id} -> ${target} (simulation).`,
  );
  return {
    delivery_status: "sent",
    delivery_message: "Simulated email delivery (no SMTP configured).",
  };
}

// ---------------------------------------------------------------------------
// Run pipeline
// ---------------------------------------------------------------------------

async function runDigest({
  workspaceId,
  windowDays = 7,
  locale = "en",
  deliveryTarget,
  skipRefresh = false,
} = {}) {
  if (!workspaceId) throw new Error("runDigest: workspaceId is required");

  const supabase = requireClient();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - windowDays * 86_400_000);

  // Mark a "running" row so the UI can surface progress.
  const { data: runRow, error: runErr } = await supabase
    .from(TABLE)
    .insert({
      workspace_id: workspaceId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      status: "running",
      delivery_target: deliveryTarget ?? null,
    })
    .select()
    .single();
  if (runErr) {
    const err = new Error(runErr.message || "Failed to start digest run");
    err.status = 500;
    throw err;
  }

  try {
    if (!skipRefresh) {
      await competitorScraperService.refreshAll(workspaceId);
    }
    const aggregate = await aggregateWorkspace(workspaceId, { windowDays });
    const narrative = await generateNarrative({ workspaceId, aggregate, locale });
    const delivery = await deliverDigest({ run: runRow, target: deliveryTarget });

    const updatePayload = {
      status: "succeeded",
      summary_json: aggregate,
      narrative_en: narrative.narrative?.summary_en ?? null,
      narrative_ar: narrative.narrative?.summary_ar ?? null,
      highlights: narrative.narrative?.highlights ?? [],
      competitor_count: aggregate.competitor_count,
      post_count: aggregate.post_count,
      delivery_status: delivery.delivery_status,
      delivery_message: delivery.delivery_message,
      llm_tokens_total: narrative.usage?.total_tokens ?? null,
      completed_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await supabase
      .from(TABLE)
      .update(updatePayload)
      .eq("id", runRow.id)
      .select()
      .single();
    if (updErr) {
      const err = new Error(updErr.message || "Failed to finalise digest run");
      err.status = 500;
      throw err;
    }

    return {
      run: updated,
      narrative: narrative.narrative,
      source: narrative.source,
    };
  } catch (err) {
    await supabase
      .from(TABLE)
      .update({
        status: "failed",
        delivery_status: "failed",
        delivery_message: String(err.message || "").slice(0, 500),
        completed_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Weekly worker bootstrap (optional)
// ---------------------------------------------------------------------------

let workerInterval = null;

/**
 * Runs `runDigest` for every workspace once per `intervalMs`. In production
 * you'd run this as a cron job, not an interval; the interval is good enough
 * for the beta and lets us test the pipeline with tiny windows.
 */
function startDigestWorker({ intervalMs = 24 * 60 * 60 * 1000 } = {}) {
  if (workerInterval) return workerInterval;
  const tick = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: workspaces, error } = await supabase
        .from("workspaces")
        .select("id, slug, name");
      if (error) {
        logger.warn?.(`[competitorDigest] worker workspace list failed: ${error.message}`);
        return;
      }
      for (const ws of workspaces || []) {
        try {
          await runDigest({ workspaceId: ws.id });
        } catch (err) {
          logger.warn?.(
            `[competitorDigest] worker failed for workspace=${ws.slug}: ${err.message}`,
          );
        }
      }
    } catch (err) {
      logger.warn?.(`[competitorDigest] worker tick error: ${err.message}`);
    }
  };
  workerInterval = setInterval(tick, intervalMs);
  return workerInterval;
}

function stopDigestWorker() {
  if (workerInterval) clearInterval(workerInterval);
  workerInterval = null;
}

module.exports = {
  listRuns,
  latestRun,
  aggregateWorkspace,
  generateNarrative,
  runDigest,
  startDigestWorker,
  stopDigestWorker,
};
