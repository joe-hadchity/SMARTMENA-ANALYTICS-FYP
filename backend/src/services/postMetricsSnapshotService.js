/**
 * postMetricsSnapshotService -- append-only time-series of engagement
 * metrics per social_post. One row per capture; latest row is what the
 * dashboard shows, the full series powers trend/anomaly insights.
 */

const db = require("./dbService");
const { getSupabase } = require("../config/supabase");

const TABLE = "post_metrics_snapshots";

async function listSnapshotsForPost(
  socialPostId,
  { from, to, limit, ascending = true } = {},
) {
  // Ensure the post exists (404s cleanly via dbService.getById).
  await db.getById("social_posts", socialPostId);

  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.status = 503;
    throw err;
  }

  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("social_post_id", socialPostId)
    .order("snapshot_time", { ascending });

  if (from) query = query.gte("snapshot_time", from);
  if (to) query = query.lte("snapshot_time", to);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    const err = new Error(error.message || "Failed to list metric snapshots");
    err.status = 400;
    err.details = { code: error.code };
    throw err;
  }
  return data || [];
}

async function createSnapshot({
  socialPostId,
  snapshotTime,
  impressions,
  reach,
  likes,
  comments,
  saves,
  shares,
  engagementRate,
  metadataJson,
}) {
  if (!socialPostId) {
    const err = new Error("social_post_id is required");
    err.status = 400;
    throw err;
  }

  return db.insert(TABLE, {
    social_post_id: socialPostId,
    snapshot_time: snapshotTime ?? new Date().toISOString(),
    impressions: impressions ?? 0,
    reach: reach ?? 0,
    likes: likes ?? 0,
    comments: comments ?? 0,
    saves: saves ?? 0,
    shares: shares ?? 0,
    engagement_rate: engagementRate ?? null,
    metadata_json: metadataJson ?? {},
  });
}

module.exports = {
  TABLE,
  listSnapshotsForPost,
  createSnapshot,
};
