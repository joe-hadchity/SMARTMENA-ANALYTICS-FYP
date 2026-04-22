/**
 * metaService -- Meta (Instagram + Facebook) Graph API adapter.
 *
 * BEHAVIOUR
 * ---------
 * Every exported method is "mock-first, live-when-possible":
 *
 *   1. If the caller provides a `socialAccount` row (preferred) we look up
 *      the associated oauth_connections row. When present AND live, we issue
 *      real Graph v19 calls to graph.facebook.com.
 *
 *   2. If no live token is available we fall back to the same structured
 *      `_status: "not_implemented" | "published_mock"` payloads that existed
 *      in mock-mode. This keeps the rest of the backend working without any
 *      branching on `is_mock` at the call site.
 *
 * The contract shape has NOT changed -- callers that don't know about
 * OAuth keep working unchanged.
 */

const axios = require("axios");
const env = require("../../config/env");
const logger = require("../../utils/logger");
const db = require("../dbService");
const oauthConnectionService = require("../oauth/oauthConnectionService");

const PROVIDER_KEY = "meta";
const SUPPORTED_PLATFORMS = ["meta_instagram", "meta_facebook"];
const GRAPH_BASE = () => `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;

function assertPlatform(platform) {
  if (platform && !SUPPORTED_PLATFORMS.includes(platform)) {
    const err = new Error(
      `metaService does not handle platform='${platform}'. Supported: ${SUPPORTED_PLATFORMS.join(", ")}`,
    );
    err.status = 400;
    throw err;
  }
}

/**
 * Resolve the access token for a social_account row. Falls back to null
 * when the row is mock-mode or when OAuth is disabled.
 *
 * The `socialAccount` argument is optional; without it the caller gets a
 * mock payload.
 */
async function resolveLiveToken(socialAccount) {
  if (!env.META_OAUTH_ENABLED) return null;
  if (!socialAccount) return null;
  if (socialAccount.is_mock) return null;
  const connectionId = socialAccount.oauth_connection_id;
  if (!connectionId) return null;
  try {
    const connection = await oauthConnectionService.getConnectionById(connectionId);
    if (!connection || connection.status !== "active") return null;
    const plaintext = oauthConnectionService.extractPlaintext(connection);
    return plaintext?.accessToken || null;
  } catch (err) {
    logger.warn?.("[metaService] failed to resolve live token:", err.message);
    return null;
  }
}

async function loadSocialAccount({ socialAccount, socialAccountId }) {
  if (socialAccount) return socialAccount;
  if (!socialAccountId) return null;
  try {
    return await db.getById("social_accounts", socialAccountId);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// fetchAccountMetadata
// ---------------------------------------------------------------------------

async function fetchAccountMetadata({
  platform = "meta_instagram",
  accountExternalId,
  socialAccount,
  socialAccountId,
} = {}) {
  assertPlatform(platform);
  const account = await loadSocialAccount({ socialAccount, socialAccountId });
  const accessToken = await resolveLiveToken(account);
  const externalId = accountExternalId || account?.external_account_id || null;

  if (!accessToken || !externalId) {
    return mockAccountMetadata({ platform, externalId });
  }

  const fields =
    platform === "meta_instagram"
      ? "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website"
      : "id,name,username,category,fan_count,followers_count,about,picture.type(large),link,website";

  try {
    const res = await axios.get(`${GRAPH_BASE()}/${externalId}`, {
      params: { fields, access_token: accessToken },
      timeout: 15_000,
    });
    const d = res.data || {};
    return {
      platform,
      provider: PROVIDER_KEY,
      accountExternalId: externalId,
      _status: "live",
      account: {
        externalId: d.id ?? externalId,
        accountName: d.username || d.name || null,
        accountType: platform === "meta_instagram" ? "business" : "page",
        displayName: d.name || d.username || null,
        profileUrl:
          d.link ||
          (d.username ? `https://instagram.com/${d.username}` : null) ||
          null,
        category: d.category || null,
        websiteUrl: d.website || null,
        followersCount: d.followers_count ?? d.fan_count ?? null,
        followingCount: d.follows_count ?? null,
        mediaCount: d.media_count ?? null,
        profileViews: null,
        biography: d.biography || d.about || null,
        profilePictureUrl:
          d.profile_picture_url || d.picture?.data?.url || null,
      },
    };
  } catch (err) {
    const message =
      err.response?.data?.error?.message || err.message || "Graph error";
    logger.warn?.(`[metaService.fetchAccountMetadata] live call failed: ${message}`);
    return {
      ...mockAccountMetadata({ platform, externalId }),
      _status: "live_error",
      _errorMessage: message,
    };
  }
}

function mockAccountMetadata({ platform, externalId }) {
  return {
    platform,
    provider: PROVIDER_KEY,
    accountExternalId: externalId ?? null,
    _status: "not_implemented",
    _note:
      "No live OAuth token found for this account (mock mode). Connect Meta via /api/oauth/meta/init to enable live Graph calls.",
    account: {
      externalId: externalId ?? null,
      accountName: null,
      accountType: null,
      displayName: null,
      profileUrl: null,
      category: null,
      websiteUrl: null,
      followersCount: null,
      followingCount: null,
      mediaCount: null,
      profileViews: null,
    },
  };
}

// ---------------------------------------------------------------------------
// fetchPostMetadata
// ---------------------------------------------------------------------------

async function fetchPostMetadata({
  platform = "meta_instagram",
  platformPostId,
  socialAccount,
  socialAccountId,
} = {}) {
  assertPlatform(platform);
  const account = await loadSocialAccount({ socialAccount, socialAccountId });
  const accessToken = await resolveLiveToken(account);

  if (!accessToken || !platformPostId) {
    return mockPostMetadata({ platform, platformPostId });
  }

  const fields =
    platform === "meta_instagram"
      ? "id,caption,media_type,media_product_type,permalink,timestamp,media_url,thumbnail_url"
      : "id,message,permalink_url,created_time,attachments{media_type,media,url}";

  try {
    const res = await axios.get(`${GRAPH_BASE()}/${platformPostId}`, {
      params: { fields, access_token: accessToken },
      timeout: 15_000,
    });
    const d = res.data || {};
    return {
      platform,
      provider: PROVIDER_KEY,
      platformPostId,
      _status: "live",
      post: {
        platformPostId: d.id ?? platformPostId,
        caption: d.caption || d.message || null,
        mediaType: normalizeMediaType(platform, d),
        permalink: d.permalink || d.permalink_url || null,
        publishedAt: d.timestamp || d.created_time || null,
        mediaUrl:
          d.media_url ||
          d.attachments?.data?.[0]?.media?.image?.src ||
          null,
        thumbnailUrl: d.thumbnail_url || null,
      },
    };
  } catch (err) {
    const message =
      err.response?.data?.error?.message || err.message || "Graph error";
    logger.warn?.(`[metaService.fetchPostMetadata] live call failed: ${message}`);
    return {
      ...mockPostMetadata({ platform, platformPostId }),
      _status: "live_error",
      _errorMessage: message,
    };
  }
}

function normalizeMediaType(platform, d) {
  if (platform === "meta_instagram") {
    const mpt = d.media_product_type;
    if (mpt === "REELS") return "reel";
    if (mpt === "STORY") return "story";
    if (d.media_type === "CAROUSEL_ALBUM") return "carousel";
    if (d.media_type === "VIDEO") return "video";
    if (d.media_type === "IMAGE") return "image";
  } else {
    const attachType = d.attachments?.data?.[0]?.media_type;
    if (attachType === "video") return "video";
    if (attachType === "album") return "carousel";
    if (attachType) return "image";
  }
  return null;
}

function mockPostMetadata({ platform, platformPostId }) {
  return {
    platform,
    provider: PROVIDER_KEY,
    platformPostId: platformPostId ?? null,
    _status: "not_implemented",
    _note:
      "No live token for this account. Falling back to stub until Meta OAuth is connected.",
    post: {
      platformPostId: platformPostId ?? null,
      caption: null,
      mediaType: null,
      permalink: null,
      publishedAt: null,
      mediaUrl: null,
      thumbnailUrl: null,
    },
  };
}

// ---------------------------------------------------------------------------
// fetchInsights
// ---------------------------------------------------------------------------

async function fetchInsights({
  scope = "post",
  platformPostId,
  accountExternalId,
  platform = "meta_instagram",
  metrics = [],
  socialAccount,
  socialAccountId,
  since,
  until,
} = {}) {
  assertPlatform(platform);
  const account = await loadSocialAccount({ socialAccount, socialAccountId });
  const accessToken = await resolveLiveToken(account);
  const targetId =
    scope === "post"
      ? platformPostId
      : accountExternalId || account?.external_account_id;

  if (!accessToken || !targetId) {
    return mockInsights({ platform, scope, platformPostId, accountExternalId, metrics, since, until });
  }

  // Sensible default metric set for Instagram Business accounts. Callers can
  // still override via `metrics`.
  let metricList = metrics;
  if (metricList.length === 0) {
    metricList =
      scope === "post"
        ? ["impressions", "reach", "likes", "comments", "saved", "shares"]
        : ["impressions", "reach", "profile_views", "follower_count"];
  }

  try {
    const res = await axios.get(`${GRAPH_BASE()}/${targetId}/insights`, {
      params: {
        metric: metricList.join(","),
        access_token: accessToken,
        since,
        until,
      },
      timeout: 15_000,
    });
    const values = flattenInsightValues(res.data?.data || []);
    return {
      platform,
      provider: PROVIDER_KEY,
      scope,
      platformPostId: platformPostId ?? null,
      accountExternalId: accountExternalId ?? null,
      requestedMetrics: metricList,
      timeframe: since || until ? { since: since ?? null, until: until ?? null } : null,
      _status: "live",
      snapshot: {
        capturedAt: new Date().toISOString(),
        impressions: values.impressions ?? null,
        reach: values.reach ?? null,
        likes: values.likes ?? null,
        comments: values.comments ?? null,
        saves: values.saved ?? null,
        shares: values.shares ?? null,
        profileViews: values.profile_views ?? null,
        followerCount: values.follower_count ?? null,
        engagementRate: computeEngagementRate(values),
      },
      raw: values,
    };
  } catch (err) {
    const message =
      err.response?.data?.error?.message || err.message || "Graph error";
    logger.warn?.(`[metaService.fetchInsights] live call failed: ${message}`);
    return {
      ...mockInsights({ platform, scope, platformPostId, accountExternalId, metrics: metricList, since, until }),
      _status: "live_error",
      _errorMessage: message,
    };
  }
}

function flattenInsightValues(data) {
  const out = {};
  for (const metric of data) {
    const name = metric.name;
    const value = metric.values?.[metric.values.length - 1]?.value;
    if (typeof value === "number") out[name] = value;
  }
  return out;
}

function computeEngagementRate(values) {
  const likes = values.likes ?? 0;
  const comments = values.comments ?? 0;
  const saves = values.saved ?? 0;
  const shares = values.shares ?? 0;
  const reach = values.reach ?? 0;
  if (!reach) return null;
  return Number(((likes + comments + saves + shares) / reach).toFixed(4));
}

function mockInsights({ platform, scope, platformPostId, accountExternalId, metrics, since, until }) {
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
      "No live token. Call /api/oauth/meta/init first to capture a Graph access token.",
    snapshot: {
      capturedAt: null,
      impressions: null,
      reach: null,
      likes: null,
      comments: null,
      saves: null,
      shares: null,
      engagementRate: null,
    },
  };
}

// ---------------------------------------------------------------------------
// publishPost -- kept mock-first for the beta. Wiring real publishing needs
// Instagram Business or Page access tokens (see metaOAuthService.SCOPES).
// ---------------------------------------------------------------------------

async function publishPost({
  platform = "meta_instagram",
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
    _note:
      "Mock publish. Live implementation will POST to Graph /media + /media_publish (Instagram) or /{page-id}/feed (Facebook).",
    publishedAt: new Date().toISOString(),
    post: {
      platformPostId: fakeId,
      permalink: `https://instagram.com/p/${fakeId}`,
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
