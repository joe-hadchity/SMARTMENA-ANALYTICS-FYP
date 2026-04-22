/**
 * competitorService -- CRUD + read helpers for the competitor tracking
 * tables introduced in schema_v10.
 *
 * The write paths (ingestSnapshot, ingestPosts) are intentionally generic so
 * the same persistence layer can serve mock, ad-library, and
 * business-discovery scrapers.
 */

const db = require("./dbService");
const { getSupabase } = require("../config/supabase");

const TABLE_ACCOUNTS = "competitor_accounts";
const TABLE_POSTS = "competitor_posts";
const TABLE_SNAPSHOTS = "competitor_metrics_snapshots";

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
// competitor_accounts
// ---------------------------------------------------------------------------

async function listCompetitors(workspaceId, { platform, includeInactive } = {}) {
  const supabase = requireClient();
  let q = supabase
    .from(TABLE_ACCOUNTS)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (platform) q = q.eq("platform", platform);
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) {
    const err = new Error(error.message || "Failed to list competitors");
    err.status = 500;
    throw err;
  }
  return data || [];
}

async function getCompetitorById(id) {
  return db.getById(TABLE_ACCOUNTS, id);
}

async function createCompetitor(workspaceId, input) {
  const payload = {
    workspace_id: workspaceId,
    platform: input.platform,
    handle: cleanHandle(input.handle),
    display_name: input.display_name ?? null,
    external_account_id: input.external_account_id ?? null,
    avatar_url: input.avatar_url ?? null,
    profile_url: input.profile_url ?? null,
    region: input.region ?? null,
    industry: input.industry ?? null,
    tags: Array.isArray(input.tags) ? input.tags : [],
    source: input.source ?? "manual",
    is_active: input.is_active ?? true,
    metadata: input.metadata ?? {},
  };
  return db.insert(TABLE_ACCOUNTS, payload);
}

async function updateCompetitor(id, patch) {
  const payload = {};
  const copyable = [
    "display_name",
    "avatar_url",
    "profile_url",
    "region",
    "industry",
    "tags",
    "is_active",
    "source",
    "metadata",
  ];
  for (const key of copyable) {
    if (patch[key] !== undefined) payload[key] = patch[key];
  }
  if (patch.handle) payload.handle = cleanHandle(patch.handle);
  return db.update(TABLE_ACCOUNTS, id, payload);
}

async function deleteCompetitor(id) {
  return db.remove(TABLE_ACCOUNTS, id);
}

function cleanHandle(h) {
  if (!h) return h;
  return String(h).trim().replace(/^@/, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// competitor_posts
// ---------------------------------------------------------------------------

async function listPostsForCompetitor(competitorId, { limit = 20 } = {}) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE_POSTS)
    .select("*")
    .eq("competitor_account_id", competitorId)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    const err = new Error(error.message || "Failed to list competitor posts");
    err.status = 500;
    throw err;
  }
  return data || [];
}

/**
 * Insert or update a batch of posts. Dedupes on (competitor_account_id,
 * platform_post_id) via upsert.
 */
async function ingestPosts(competitorId, posts) {
  if (!posts || posts.length === 0) return { inserted: 0, updated: 0 };
  const supabase = requireClient();
  const rows = posts.map((p) => ({
    competitor_account_id: competitorId,
    platform_post_id: p.platform_post_id,
    caption: p.caption ?? null,
    caption_lang: p.caption_lang ?? null,
    media_type: p.media_type ?? null,
    permalink: p.permalink ?? null,
    posted_at: p.posted_at ?? null,
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    raw_payload: p.raw_payload ?? {},
  }));
  const { data, error } = await supabase
    .from(TABLE_POSTS)
    .upsert(rows, {
      onConflict: "competitor_account_id,platform_post_id",
    })
    .select();
  if (error) {
    const err = new Error(error.message || "Failed to ingest competitor posts");
    err.status = 500;
    throw err;
  }
  return { inserted: data?.length ?? 0 };
}

// ---------------------------------------------------------------------------
// competitor_metrics_snapshots
// ---------------------------------------------------------------------------

async function ingestSnapshot({ competitorId, postId = null, scope = "post", metrics = {} }) {
  if (!competitorId) throw new Error("ingestSnapshot: competitorId is required");
  const row = {
    competitor_account_id: competitorId,
    competitor_post_id: postId,
    scope,
    followers_count: metrics.followers_count ?? null,
    likes: metrics.likes ?? null,
    comments: metrics.comments ?? null,
    shares: metrics.shares ?? null,
    saves: metrics.saves ?? null,
    impressions: metrics.impressions ?? null,
    reach: metrics.reach ?? null,
    video_views: metrics.video_views ?? null,
    engagement_rate: clampRate(metrics.engagement_rate),
    metadata: metrics.metadata ?? {},
  };
  return db.insert(TABLE_SNAPSHOTS, row);
}

async function latestSnapshotForPosts(postIds) {
  if (!postIds || postIds.length === 0) return [];
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE_SNAPSHOTS)
    .select("*")
    .in("competitor_post_id", postIds)
    .order("captured_at", { ascending: false });
  if (error) {
    const err = new Error(error.message || "Failed to load snapshots");
    err.status = 500;
    throw err;
  }
  // Keep only the most recent snapshot per post.
  const seen = new Set();
  const out = [];
  for (const row of data || []) {
    if (seen.has(row.competitor_post_id)) continue;
    seen.add(row.competitor_post_id);
    out.push(row);
  }
  return out;
}

async function latestAccountSnapshot(competitorId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE_SNAPSHOTS)
    .select("*")
    .eq("competitor_account_id", competitorId)
    .eq("scope", "account")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    const err = new Error(error.message || "Failed to load account snapshot");
    err.status = 500;
    throw err;
  }
  return data;
}

function clampRate(rate) {
  if (rate == null) return null;
  const n = Number(rate);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

async function touchLastScraped(competitorId) {
  return db.update(TABLE_ACCOUNTS, competitorId, {
    last_scraped_at: new Date().toISOString(),
  });
}

module.exports = {
  TABLE_ACCOUNTS,
  TABLE_POSTS,
  TABLE_SNAPSHOTS,
  listCompetitors,
  getCompetitorById,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  listPostsForCompetitor,
  ingestPosts,
  ingestSnapshot,
  latestSnapshotForPosts,
  latestAccountSnapshot,
  touchLastScraped,
};
