/**
 * xService -- placeholder for future X (Twitter) API v2 integrations.
 * Same shape as metaService and tiktokService. All methods are stubs
 * until OAuth 2.0 PKCE flow and a paid X API tier are in place.
 */

const PROVIDER_KEY = "x";
const SUPPORTED_PLATFORMS = ["x"];

function assertPlatform(platform) {
  if (platform && !SUPPORTED_PLATFORMS.includes(platform)) {
    const err = new Error(
      `xService does not handle platform='${platform}'. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
    );
    err.status = 400;
    throw err;
  }
}

/**
 * Live implementation will call:
 *   GET /2/users/me?user.fields=username,name,profile_image_url,public_metrics
 *   or /2/users/:id with equivalent fields.
 */
async function fetchAccountMetadata({ accountExternalId, platform = "x" } = {}) {
  assertPlatform(platform);
  return {
    platform,
    provider: PROVIDER_KEY,
    accountExternalId: accountExternalId ?? null,
    _status: "not_implemented",
    _note:
      "Will call X API v2 /2/users/:id?user.fields=... once OAuth 2.0 PKCE is wired up.",
    account: {
      externalId: accountExternalId ?? null,
      accountName: null,
      accountType: null, // 'personal' | 'business' | 'verified_organisation'
      displayName: null,
      profileUrl: null,
      bio: null,
      followersCount: null,
      followingCount: null,
      tweetCount: null,
      verified: null,
    },
  };
}

/**
 * Live implementation will call:
 *   GET /2/tweets/:id?tweet.fields=text,created_at,entities,attachments
 */
async function fetchPostMetadata({ platformPostId, platform = "x" } = {}) {
  assertPlatform(platform);
  return {
    platform,
    provider: PROVIDER_KEY,
    platformPostId: platformPostId ?? null,
    _status: "not_implemented",
    _note:
      "Will call /2/tweets/:id and normalise entities.urls / attachments.media_keys to mediaType.",
    post: {
      platformPostId: platformPostId ?? null,
      caption: null, // X calls this 'text' -- we normalise to caption
      mediaType: null, // 'text' | 'image' | 'video' | 'carousel'
      permalink: null,
      publishedAt: null,
      replyToId: null,
      quotedPostId: null,
    },
  };
}

/**
 * Live implementation will call the public-metrics / organic-metrics
 * endpoints (organic_metrics needs user-context OAuth):
 *   GET /2/tweets/:id?tweet.fields=public_metrics,non_public_metrics,organic_metrics
 */
async function fetchInsights({
  scope = "post",
  platformPostId,
  accountExternalId,
  platform = "x",
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
      "Will map impression_count / like_count / reply_count / retweet_count / bookmark_count into post_metrics_snapshots.",
    snapshot: {
      capturedAt: null,
      impressions: null, // x: impression_count
      reach: null, // x: no direct reach metric; left null
      likes: null,
      comments: null, // x: reply_count
      saves: null, // x: bookmark_count
      shares: null, // x: retweet_count + quote_count
      engagementRate: null,
    },
  };
}

/**
 * Publish a post draft to X (Twitter). Mock implementation; returns a fake
 * tweet id. Live: POST /2/tweets with OAuth2 user context.
 */
async function publishPost({
  platform = "x",
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
    _note: "Mock X publish. Live: POST /2/tweets.",
    publishedAt: new Date().toISOString(),
    post: {
      platformPostId: fakeId,
      permalink: `https://x.com/i/status/${fakeId}`,
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
