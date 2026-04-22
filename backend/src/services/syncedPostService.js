/**
 * syncedPostService -- persistence + read helpers for synced_posts and
 * post_metrics. Does not talk to providers directly; that orchestration
 * lives in syncService.
 */

const db = require("./dbService");
const { getSupabase } = require("../config/supabase");

const SYNCED_POSTS = "synced_posts";
const POST_METRICS = "post_metrics";

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

async function listSyncedPosts({
  workspaceId,
  socialAccountId,
  lang,
  postType,
  limit = 50,
} = {}) {
  const supabase = requireClient();
  let query = supabase
    .from(SYNCED_POSTS)
    .select("*, latest_metrics:post_metrics(likes, comments, shares, saves, impressions, reach, video_views, engagement_rate, captured_at)")
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  if (socialAccountId) query = query.eq("social_account_id", socialAccountId);
  if (lang) query = query.eq("caption_lang", lang);
  if (postType) query = query.eq("post_type", postType);

  const { data, error } = await query;
  if (error) {
    const err = new Error(error.message || "Failed to list synced posts");
    err.status = 400;
    err.details = { code: error.code };
    throw err;
  }

  // Reduce embedded metrics to just the latest snapshot for convenience.
  return (data || []).map((row) => {
    const metrics = Array.isArray(row.latest_metrics) ? row.latest_metrics : [];
    const latest =
      metrics.length > 0
        ? metrics
            .slice()
            .sort(
              (a, b) => new Date(b.captured_at) - new Date(a.captured_at),
            )[0]
        : null;
    const { latest_metrics: _ignored, ...rest } = row;
    return { ...rest, latest_metrics: latest };
  });
}

async function getSyncedPostById(id) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(SYNCED_POSTS)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    const err = new Error(error.message || "Failed to load synced post");
    err.status = 400;
    err.details = { code: error.code };
    throw err;
  }
  if (!data) {
    const err = new Error(`synced_post ${id} not found`);
    err.status = 404;
    throw err;
  }
  return data;
}

async function listPostMetrics({ syncedPostId, from, to, limit = 200 } = {}) {
  const supabase = requireClient();
  let query = supabase
    .from(POST_METRICS)
    .select("*")
    .eq("synced_post_id", syncedPostId)
    .order("captured_at", { ascending: true })
    .limit(limit);

  if (from) query = query.gte("captured_at", from);
  if (to) query = query.lte("captured_at", to);

  const { data, error } = await query;
  if (error) {
    const err = new Error(error.message || "Failed to list metrics");
    err.status = 400;
    err.details = { code: error.code };
    throw err;
  }
  return data || [];
}

async function upsertSyncedPost(row) {
  const supabase = requireClient();
  // Upsert on (social_account_id, external_post_id) so re-syncs are idempotent.
  const { data, error } = await supabase
    .from(SYNCED_POSTS)
    .upsert(row, { onConflict: "social_account_id,external_post_id" })
    .select()
    .single();
  if (error) {
    const err = new Error(error.message || "Failed to upsert synced post");
    err.status = 400;
    err.details = { code: error.code };
    throw err;
  }
  return data;
}

async function insertMetrics(row) {
  return db.insert(POST_METRICS, row);
}

module.exports = {
  SYNCED_POSTS,
  POST_METRICS,
  listSyncedPosts,
  getSyncedPostById,
  listPostMetrics,
  upsertSyncedPost,
  insertMetrics,
};
