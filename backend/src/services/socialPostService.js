/**
 * socialPostService -- persistence for posts ingested from connected social
 * accounts (new v4 analytics-storage model).
 *
 * This is the forward-looking canonical table for external posts. The v2
 * `synced_posts` table stays in place for existing flows; future provider
 * adapters will write into `social_posts` via this service.
 */

const db = require("./dbService");
const { getSupabase } = require("../config/supabase");

const TABLE = "social_posts";

async function listSocialPosts({ socialAccountId, mediaType, limit } = {}) {
  const filters = {};
  if (socialAccountId) filters.social_account_id = socialAccountId;
  if (mediaType) filters.media_type = mediaType;

  return db.list(TABLE, {
    filters: Object.keys(filters).length ? filters : undefined,
    orderBy: "published_at",
    ascending: false,
    limit,
  });
}

async function listAllSocialPostsForWorkspace({ workspaceId, socialAccountId, mediaType, limit = 60 } = {}) {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error("Supabase is not configured.");
    err.status = 503;
    throw err;
  }

  // Resolve account IDs scoped to this workspace
  let accountIds;
  if (socialAccountId) {
    accountIds = [socialAccountId];
  } else {
    const { data: accounts, error: acctErr } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("workspace_id", workspaceId);
    if (acctErr) throw new Error(acctErr.message);
    accountIds = (accounts || []).map((a) => a.id);
  }

  if (!accountIds.length) return [];

  const { data, error } = await supabase
    .from("social_posts")
    .select(
      "*, social_accounts(handle, display_name, provider), post_metrics_snapshots(likes, comments, shares, saves, impressions, reach, engagement_rate, snapshot_time)",
    )
    .in("social_account_id", accountIds)
    .order("published_at", { ascending: false })
    .limit(Number(limit) || 60);

  if (error) {
    const err = new Error(error.message || "Failed to list social posts");
    err.status = 400;
    throw err;
  }

  return (data || []).filter((row) => row.metadata_json?.source === "meta_graph").map((row) => {
    const snapshots = Array.isArray(row.post_metrics_snapshots) ? row.post_metrics_snapshots : [];
    const latest =
      snapshots.length > 0
        ? snapshots.slice().sort((a, b) => new Date(b.snapshot_time) - new Date(a.snapshot_time))[0]
        : null;
    const { post_metrics_snapshots: _s, ...rest } = row;
    // Resolve media_url: top-level column (schema_v15) or fallback from metadata_json
    const meta = row.metadata_json || {};
    const rawPayload = meta.raw_payload || {};
    const resolvedMediaUrl =
      row.media_url ||
      meta.media_url ||
      rawPayload.displayUrl ||
      rawPayload.imageUrl ||
      rawPayload.thumbnailUrl ||
      rawPayload.videoUrl ||
      null;
    return { ...rest, media_url: resolvedMediaUrl, latest_metrics: latest };
  });
}

async function getSocialPostById(id) {
  return db.getById(TABLE, id);
}

async function listPostsForAccount(socialAccountId, { mediaType, limit } = {}) {
  // Ensure the account exists (404s cleanly via dbService.getById).
  await db.getById("social_accounts", socialAccountId);
  return listSocialPosts({ socialAccountId, mediaType, limit });
}

async function createSocialPost({
  socialAccountId,
  platformPostId,
  caption,
  mediaType,
  permalink,
  publishedAt,
  metadataJson,
}) {
  if (!socialAccountId) {
    const err = new Error("social_account_id is required");
    err.status = 400;
    throw err;
  }
  if (!platformPostId) {
    const err = new Error("platform_post_id is required");
    err.status = 400;
    throw err;
  }

  return db.insert(TABLE, {
    social_account_id: socialAccountId,
    platform_post_id: platformPostId,
    caption: caption ?? null,
    media_type: mediaType ?? null,
    permalink: permalink ?? null,
    published_at: publishedAt ?? null,
    metadata_json: metadataJson ?? {},
  });
}

module.exports = {
  TABLE,
  listSocialPosts,
  listAllSocialPostsForWorkspace,
  getSocialPostById,
  listPostsForAccount,
  createSocialPost,
};
