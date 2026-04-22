/**
 * socialPostService -- persistence for posts ingested from connected social
 * accounts (new v4 analytics-storage model).
 *
 * This is the forward-looking canonical table for external posts. The v2
 * `synced_posts` table stays in place for existing flows; future provider
 * adapters will write into `social_posts` via this service.
 */

const db = require("./dbService");

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
  getSocialPostById,
  listPostsForAccount,
  createSocialPost,
};
