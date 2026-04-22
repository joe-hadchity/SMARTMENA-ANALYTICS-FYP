/**
 * tiktokService -- placeholder for future TikTok Business / Display API
 * integrations. Same interface as metaService so the rest of the backend
 * can target the two interchangeably once real OAuth is wired up.
 *
 * Every method is an explicit stub. No live calls, no token storage.
 */

const PROVIDER_KEY = "tiktok";
const SUPPORTED_PLATFORMS = ["tiktok"];

function assertPlatform(platform) {
  if (platform && !SUPPORTED_PLATFORMS.includes(platform)) {
    const err = new Error(
      `tiktokService does not handle platform='${platform}'. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
    );
    err.status = 400;
    throw err;
  }
}

/**
 * Live implementation will call:
 *   GET /v2/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,...
 */
async function fetchAccountMetadata({
  accountExternalId,
  platform = "tiktok",
} = {}) {
  assertPlatform(platform);
  return {
    platform,
    provider: PROVIDER_KEY,
    accountExternalId: accountExternalId ?? null,
    _status: "not_implemented",
    _note:
      "Will call TikTok /v2/user/info/ once the TikTok for Developers app is approved.",
    account: {
      externalId: accountExternalId ?? null,
      accountName: null,
      accountType: null, // 'creator' | 'business'
      displayName: null,
      profileUrl: null,
      bio: null,
      followersCount: null,
      followingCount: null,
      likesCount: null,
      videoCount: null,
      profileViews: null,
    },
  };
}

/**
 * Live implementation will call:
 *   GET /v2/video/query/?fields=id,title,cover_image_url,share_url,create_time,duration
 */
async function fetchPostMetadata({ platformPostId, platform = "tiktok" } = {}) {
  assertPlatform(platform);
  return {
    platform,
    provider: PROVIDER_KEY,
    platformPostId: platformPostId ?? null,
    _status: "not_implemented",
    _note:
      "Will call TikTok /v2/video/query/ and normalise create_time -> publishedAt.",
    post: {
      platformPostId: platformPostId ?? null,
      caption: null,
      mediaType: "video", // TikTok is video-only -- hard-coded when real impl lands
      permalink: null,
      publishedAt: null,
      durationSeconds: null,
      coverImageUrl: null,
    },
  };
}

/**
 * Live implementation will call the Video Insights endpoint:
 *   GET /v2/research/video/query/ or /v2/insights/video/... (scope-dependent)
 */
async function fetchInsights({
  scope = "post",
  platformPostId,
  accountExternalId,
  platform = "tiktok",
  metrics = [],
  since,
  until,
} = {}) {
  assertPlatform(platform);
  return {
    platform,
    provider: PROVIDER_KEY,
    scope,
    platformPostId: platformPostId ?? null,
    accountExternalId: accountExternalId ?? null,
    requestedMetrics: metrics,
    timeframe: since || until ? { since: since ?? null, until: until ?? null } : null,
    _status: "not_implemented",
    _note:
      "Will normalise TikTok video_view/likes/shares/comments/reach into post_metrics_snapshots.",
    snapshot: {
      capturedAt: null,
      impressions: null, // tiktok: video_view
      reach: null,
      likes: null,
      comments: null,
      saves: null,
      shares: null,
      engagementRate: null,
    },
  };
}

/**
 * Publish a post draft to TikTok. Mock implementation; returns a fake
 * post id. Live: POST /v2/post/publish/inbox/video/init/ etc.
 */
async function publishPost({
  platform = "tiktok",
  caption,
  mediaUrls = [],
  hashtags = [],
  accountExternalId,
} = {}) {
  assertPlatform(platform);
  const fakeId = `mock_${platform}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  return {
    platform,
    provider: PROVIDER_KEY,
    accountExternalId: accountExternalId ?? null,
    _status: "published_mock",
    _note: "Mock TikTok publish. Live: /v2/post/publish/inbox/video/init.",
    publishedAt: new Date().toISOString(),
    post: {
      platformPostId: fakeId,
      permalink: `https://tiktok.com/@user/video/${fakeId}`,
      caption: caption ?? null,
      mediaUrls,
      hashtags,
    },
  };
}

module.exports = {
  PROVIDER_KEY,
  SUPPORTED_PLATFORMS,
  fetchAccountMetadata,
  fetchPostMetadata,
  fetchInsights,
  publishPost,
};
