/**
 * syncService.syncAccount(accountId)
 *
 * Orchestrates a synchronous "fetch-and-store" for one connected social
 * account:
 *
 *   1. Load the social_accounts row.
 *   2. Ask the matching provider for a fresh list of posts + per-post metrics.
 *   3. Upsert synced_posts.
 *   4. Append a post_metrics row per post (time-series, append-only).
 *   5. Stamp social_accounts.last_synced_at.
 *
 * Works against both mock and real providers (once real providers land),
 * since the only contact point is the provider interface in ./providers.
 *
 * There is no job queue and no cron -- sync runs on-demand inside the
 * request that triggered it. That is intentional for the beta.
 */

const socialAccountService = require("./socialAccountService");
const syncedPostService = require("./syncedPostService");
const { getProvider } = require("./providers");
const logger = require("../utils/logger");

async function syncAccount(accountId, { limit = 24, daysBack = 30 } = {}) {
  const account = await socialAccountService.getSocialAccountById(accountId);
  const provider = getProvider(account.provider);

  const posts = await provider.listPosts(account, { limit, daysBack });

  const savedPosts = [];
  const savedMetrics = [];

  for (const post of posts) {
    const syncedRow = await syncedPostService.upsertSyncedPost({
      workspace_id: account.workspace_id,
      social_account_id: account.id,
      external_post_id: post.externalPostId,
      post_type: post.postType,
      caption: post.caption,
      caption_lang: post.captionLang,
      media_url: post.mediaUrl ?? null,
      permalink: post.permalink ?? null,
      posted_at: post.postedAt ?? null,
      raw_payload: post.raw ?? {},
      fetched_at: new Date().toISOString(),
    });
    savedPosts.push(syncedRow);

    // Get a metrics snapshot for this post; snake_case for the DB.
    const metrics = await provider.fetchPostMetrics(account, {
      ...post,
      external_post_id: post.externalPostId,
      post_type: post.postType,
    });

    const metricsRow = await syncedPostService.insertMetrics({
      synced_post_id: syncedRow.id,
      captured_at: metrics.capturedAt || new Date().toISOString(),
      likes: metrics.likes ?? 0,
      comments: metrics.comments ?? 0,
      shares: metrics.shares ?? 0,
      saves: metrics.saves ?? 0,
      impressions: metrics.impressions ?? 0,
      reach: metrics.reach ?? 0,
      video_views: metrics.videoViews ?? 0,
      engagement_rate: metrics.engagementRate ?? null,
    });
    savedMetrics.push(metricsRow);
  }

  await socialAccountService.touchLastSyncedAt(account.id);

  logger.info(
    `sync: account=${account.id} provider=${account.provider} posts=${savedPosts.length} metrics=${savedMetrics.length}`,
  );

  return {
    accountId: account.id,
    provider: account.provider,
    postsSynced: savedPosts.length,
    metricsRecorded: savedMetrics.length,
    syncedAt: new Date().toISOString(),
  };
}

module.exports = { syncAccount };
