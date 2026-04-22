/**
 * trendAggregatorService -- rebuild trend_terms + trend_snapshots for a
 * workspace from the source tables.
 *
 * Sources:
 *   * competitor_posts   (joined via competitor_accounts.workspace_id)
 *   * social_posts       (joined via social_accounts.workspace_id)
 *
 * Per-post we emit four kinds of trend terms:
 *   1. hashtag  -- from the post's `hashtags` array AND anything re-extracted
 *                  from the caption (covers captions that weren't parsed
 *                  upstream).
 *   2. topic    -- from topicLabeler (keyword-first, optional LLM fallback).
 *   3. format   -- from media_type (reel / carousel / image / video).
 *   4. sound    -- from metadata.music_id when present.
 *
 * Per (term, day) we upsert a snapshot carrying post_count,
 * engagement_sum/avg, unique_authors, platform + source breakdowns, and up
 * to 3 sample post references.
 *
 * This service is idempotent: re-running it over the same window will
 * upsert-replace the same (term, day) rows.
 */

const { getSupabase } = require("../../config/supabase");
const logger = require("../../utils/logger");
const hashtagExtractor = require("./hashtagExtractor");
const topicLabeler = require("./topicLabeler");

const TABLE_TERMS = "trend_terms";
const TABLE_SNAPSHOTS = "trend_snapshots";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function dayKey(d) {
  // UTC day bucket: YYYY-MM-DD
  return new Date(d).toISOString().slice(0, 10);
}

function normalizeFormat(mediaType) {
  if (!mediaType) return null;
  const m = String(mediaType).toLowerCase();
  if (["reel", "reels", "video_short"].includes(m)) return "reel";
  if (["carousel", "album"].includes(m)) return "carousel";
  if (["image", "photo"].includes(m)) return "image";
  if (["video", "long_video"].includes(m)) return "video";
  if (["story", "stories"].includes(m)) return "story";
  if (["text"].includes(m)) return "text";
  return m;
}

function formatDisplay(slug) {
  if (!slug) return null;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

// ---------------------------------------------------------------------------
// Source loaders
// ---------------------------------------------------------------------------

async function loadCompetitorPosts(workspaceId, sinceISO) {
  const supabase = requireClient();
  // First resolve competitor accounts for the workspace.
  const { data: accounts, error: accErr } = await supabase
    .from("competitor_accounts")
    .select("id, platform, handle")
    .eq("workspace_id", workspaceId);
  if (accErr) {
    logger.warn?.(`[trendAggregator] competitor_accounts query failed: ${accErr.message}`);
    return [];
  }
  if (!accounts || accounts.length === 0) return [];

  const accountIdMap = new Map(accounts.map((a) => [a.id, a]));
  const accountIds = accounts.map((a) => a.id);

  // Load posts in this window.
  const { data: posts, error: postsErr } = await supabase
    .from("competitor_posts")
    .select(
      "id, competitor_account_id, caption, caption_lang, media_type, hashtags, posted_at, permalink, raw_payload",
    )
    .in("competitor_account_id", accountIds)
    .gte("posted_at", sinceISO)
    .order("posted_at", { ascending: false })
    .limit(5000);
  if (postsErr) {
    logger.warn?.(`[trendAggregator] competitor_posts query failed: ${postsErr.message}`);
    return [];
  }
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  // Latest snapshot per post -- cheap, one round-trip.
  const { data: snaps, error: snapErr } = await supabase
    .from("competitor_metrics_snapshots")
    .select("competitor_post_id, likes, comments, shares, saves, video_views, captured_at")
    .in("competitor_post_id", postIds)
    .order("captured_at", { ascending: false });
  if (snapErr) {
    logger.warn?.(`[trendAggregator] competitor snapshots query failed: ${snapErr.message}`);
  }
  const snapById = new Map();
  for (const s of snaps || []) {
    if (!snapById.has(s.competitor_post_id)) snapById.set(s.competitor_post_id, s);
  }

  return posts.map((p) => {
    const acc = accountIdMap.get(p.competitor_account_id) || {};
    const snap = snapById.get(p.id) || {};
    const engagement =
      (snap.likes || 0) + (snap.comments || 0) + (snap.shares || 0) + (snap.saves || 0);
    return {
      source: "competitor",
      post_id: p.id,
      author_id: p.competitor_account_id,
      handle: acc.handle,
      platform: acc.platform,
      caption: p.caption,
      hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
      media_type: p.media_type,
      posted_at: p.posted_at,
      permalink: p.permalink,
      engagement_total: engagement,
      raw_payload: p.raw_payload || {},
    };
  });
}

async function loadOwnPosts(workspaceId, sinceISO) {
  const supabase = requireClient();
  const { data: accounts, error: accErr } = await supabase
    .from("social_accounts")
    .select("id, provider, handle")
    .eq("workspace_id", workspaceId);
  if (accErr) {
    logger.warn?.(`[trendAggregator] social_accounts query failed: ${accErr.message}`);
    return [];
  }
  if (!accounts || accounts.length === 0) return [];
  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const accountIds = accounts.map((a) => a.id);

  const { data: posts, error: postsErr } = await supabase
    .from("social_posts")
    .select(
      "id, social_account_id, caption, media_type, permalink, published_at, metadata_json",
    )
    .in("social_account_id", accountIds)
    .gte("published_at", sinceISO)
    .order("published_at", { ascending: false })
    .limit(5000);
  if (postsErr) {
    logger.warn?.(`[trendAggregator] social_posts query failed: ${postsErr.message}`);
    return [];
  }
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const { data: snaps, error: snapErr } = await supabase
    .from("post_metrics_snapshots")
    .select("social_post_id, likes, comments, shares, saves, snapshot_time")
    .in("social_post_id", postIds)
    .order("snapshot_time", { ascending: false });
  if (snapErr) {
    logger.warn?.(`[trendAggregator] own snapshots query failed: ${snapErr.message}`);
  }
  const snapById = new Map();
  for (const s of snaps || []) {
    if (!snapById.has(s.social_post_id)) snapById.set(s.social_post_id, s);
  }

  return posts.map((p) => {
    const acc = accMap.get(p.social_account_id) || {};
    const snap = snapById.get(p.id) || {};
    const engagement =
      (snap.likes || 0) + (snap.comments || 0) + (snap.shares || 0) + (snap.saves || 0);
    return {
      source: "own",
      post_id: p.id,
      author_id: p.social_account_id,
      handle: acc.handle,
      platform: acc.provider,
      caption: p.caption,
      hashtags: [],
      media_type: p.media_type,
      posted_at: p.published_at,
      permalink: p.permalink,
      engagement_total: engagement,
      raw_payload: p.metadata_json || {},
    };
  });
}

// ---------------------------------------------------------------------------
// Term generation per post
// ---------------------------------------------------------------------------

/**
 * Return the list of {kind, value, display} pairs for a single post.
 * `allowLLM` controls whether we invoke the topic labeler's LLM fallback.
 */
async function termsForPost(post, { allowLLM = true } = {}) {
  const out = [];

  // 1) hashtags (merge existing array + anything re-extracted from caption)
  const hashtagSet = new Map(); // value -> display
  for (const raw of post.hashtags || []) {
    const n = hashtagExtractor.normalizeExisting(raw);
    if (n) hashtagSet.set(n.value, n.display);
  }
  for (const h of hashtagExtractor.extract(post.caption || "")) {
    if (!hashtagSet.has(h.value)) hashtagSet.set(h.value, h.display);
  }
  for (const [value, display] of hashtagSet.entries()) {
    out.push({ kind: "hashtag", value, display });
  }

  // 2) topic
  const topic = await topicLabeler.labelCaption(post.caption || "", {
    allowLLM,
  });
  if (topic) {
    out.push({ kind: "topic", value: topic.slug, display: topic.display });
  }

  // 3) format
  const fmt = normalizeFormat(post.media_type);
  if (fmt) {
    out.push({ kind: "format", value: fmt, display: formatDisplay(fmt) });
  }

  // 4) sound (best-effort from metadata / raw_payload)
  const musicId =
    post.raw_payload?.music_id ||
    post.raw_payload?.music?.id ||
    post.raw_payload?.audio_id ||
    post.raw_payload?.sound_id;
  const musicName =
    post.raw_payload?.music?.name ||
    post.raw_payload?.music_name ||
    post.raw_payload?.sound_name;
  if (musicId) {
    out.push({
      kind: "sound",
      value: String(musicId).toLowerCase(),
      display: musicName || `Sound ${String(musicId).slice(0, 8)}`,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Upsert helpers
// ---------------------------------------------------------------------------

async function upsertTerms(workspaceId, terms) {
  // terms: Array<{kind, value, display}>
  if (terms.length === 0) return new Map();
  const supabase = requireClient();
  const rows = terms.map((t) => ({
    workspace_id: workspaceId,
    kind: t.kind,
    value: t.value,
    display_label: t.display || t.value,
    last_seen_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from(TABLE_TERMS)
    .upsert(rows, {
      onConflict: "workspace_id,kind,value",
      ignoreDuplicates: false,
    })
    .select("id, kind, value");
  if (error) {
    const err = new Error(error.message || "Failed to upsert trend terms");
    err.status = 500;
    throw err;
  }
  const map = new Map();
  for (const row of data || []) {
    map.set(`${row.kind}:${row.value}`, row.id);
  }
  return map;
}

async function upsertSnapshots(workspaceId, snapshots) {
  if (snapshots.length === 0) return 0;
  const supabase = requireClient();
  const rows = snapshots.map((s) => ({
    trend_term_id: s.trend_term_id,
    workspace_id: workspaceId,
    day: s.day,
    post_count: s.post_count,
    engagement_sum: s.engagement_sum,
    engagement_avg: s.engagement_avg,
    unique_authors: s.unique_authors,
    platform_breakdown: s.platform_breakdown,
    source_breakdown: s.source_breakdown,
    sample_post_ids: s.sample_post_ids,
  }));
  const { error } = await supabase
    .from(TABLE_SNAPSHOTS)
    .upsert(rows, {
      onConflict: "trend_term_id,day",
      ignoreDuplicates: false,
    });
  if (error) {
    const err = new Error(error.message || "Failed to upsert trend snapshots");
    err.status = 500;
    throw err;
  }
  return rows.length;
}

// ---------------------------------------------------------------------------
// Bucketer
// ---------------------------------------------------------------------------

/**
 * Given an iterable of { post, terms[] }, produce an array of upsertable
 * snapshot rows keyed by (termKey, day).
 */
function bucket(entries, termIdByKey) {
  // buckets: Map<termKey|day, bucket>
  const buckets = new Map();

  for (const { post, terms } of entries) {
    const day = dayKey(post.posted_at || new Date());
    for (const term of terms) {
      const termKey = `${term.kind}:${term.value}`;
      const termId = termIdByKey.get(termKey);
      if (!termId) continue;
      const bucketKey = `${termId}|${day}`;
      let b = buckets.get(bucketKey);
      if (!b) {
        b = {
          trend_term_id: termId,
          day,
          post_count: 0,
          engagement_sum: 0,
          unique_authors_set: new Set(),
          platform_breakdown: {},
          source_breakdown: {},
          sample_post_ids: [],
          _best_engagement: -1,
          _samples_meta: [],
        };
        buckets.set(bucketKey, b);
      }
      b.post_count += 1;
      b.engagement_sum += Number(post.engagement_total || 0);
      if (post.author_id) b.unique_authors_set.add(post.author_id);
      if (post.platform) {
        b.platform_breakdown[post.platform] =
          (b.platform_breakdown[post.platform] || 0) + 1;
      }
      b.source_breakdown[post.source] =
        (b.source_breakdown[post.source] || 0) + 1;

      // Keep top 3 sample posts for drill-down
      b._samples_meta.push({
        post_id: post.post_id,
        source: post.source,
        engagement: Number(post.engagement_total || 0),
        permalink: post.permalink,
        caption: (post.caption || "").slice(0, 140),
      });
    }
  }

  const out = [];
  for (const b of buckets.values()) {
    const samples = b._samples_meta
      .sort((a, z) => z.engagement - a.engagement)
      .slice(0, 3);
    out.push({
      trend_term_id: b.trend_term_id,
      day: b.day,
      post_count: b.post_count,
      engagement_sum: b.engagement_sum,
      engagement_avg:
        b.post_count > 0
          ? Number((b.engagement_sum / b.post_count).toFixed(3))
          : 0,
      unique_authors: b.unique_authors_set.size,
      platform_breakdown: b.platform_breakdown,
      source_breakdown: b.source_breakdown,
      sample_post_ids: samples,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

/**
 * Rebuild trend snapshots for a workspace over the last `windowDays` days.
 * Idempotent -- upserts on (trend_term_id, day).
 *
 * Returns a summary of work performed.
 */
async function rebuildForWorkspace(workspaceId, { windowDays = 30, allowLLM = true } = {}) {
  if (!workspaceId) throw new Error("rebuildForWorkspace: workspaceId required");
  const sinceISO = new Date(
    Date.now() - windowDays * 86_400_000,
  ).toISOString();

  const started = Date.now();
  const [competitorPosts, ownPosts] = await Promise.all([
    loadCompetitorPosts(workspaceId, sinceISO),
    loadOwnPosts(workspaceId, sinceISO),
  ]);
  const allPosts = [...competitorPosts, ...ownPosts];

  // Generate (post, terms) pairs. Keep a flat dedup set of unique terms.
  const uniqueTerms = new Map(); // termKey -> {kind, value, display}
  const entries = [];
  for (const post of allPosts) {
    const terms = await termsForPost(post, { allowLLM });
    entries.push({ post, terms });
    for (const t of terms) {
      const k = `${t.kind}:${t.value}`;
      if (!uniqueTerms.has(k)) uniqueTerms.set(k, t);
    }
  }

  // Upsert terms catalog; get back id map.
  const termIdByKey = await upsertTerms(
    workspaceId,
    Array.from(uniqueTerms.values()),
  );

  // Build + upsert per-day snapshots.
  const snapshotRows = bucket(entries, termIdByKey);
  await upsertSnapshots(workspaceId, snapshotRows);

  const elapsedMs = Date.now() - started;
  const summary = {
    workspace_id: workspaceId,
    window_days: windowDays,
    post_count: allPosts.length,
    own_posts: ownPosts.length,
    competitor_posts: competitorPosts.length,
    term_count: uniqueTerms.size,
    snapshot_rows: snapshotRows.length,
    elapsed_ms: elapsedMs,
  };
  logger.info?.(
    `[trendAggregator] workspace=${workspaceId} posts=${allPosts.length} terms=${uniqueTerms.size} rows=${snapshotRows.length} in ${elapsedMs}ms`,
  );
  return summary;
}

module.exports = {
  rebuildForWorkspace,
  termsForPost, // exported for tests
  normalizeFormat,
  dayKey,
};
