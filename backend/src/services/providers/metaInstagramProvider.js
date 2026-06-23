/**
 * metaInstagramProvider — wraps the Instagram Graph API (graph.instagram.com).
 *
 * Uses the "Instagram Login" flow (IGAA tokens), which gives a Business or
 * Creator account read access to:
 *   - profile metadata + follower count
 *   - own media list
 *   - per-post insights (reach, likes, comments, saved, shares)
 *
 * Does NOT require a linked Facebook Page (different from Facebook Login for
 * Business). Only ever reads the workspace's own account — competitors stay
 * on Apify.
 */

const axios = require("axios");

const env = require("../../config/env");

const DEFAULT_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "like_count",
  "comments_count",
].join(",");

const PROFILE_FIELDS = [
  "id",
  "username",
  "media_count",
  "followers_count",
  "follows_count",
  "name",
  "biography",
  "profile_picture_url",
  "website",
].join(",");

// Allowed insight metrics by media type. Asking for a metric a media doesn't
// support returns a 400 from Graph, so we filter per-type.
// See https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-media/insights
const INSIGHT_METRICS = {
  IMAGE: ["reach", "likes", "comments", "saved", "shares", "total_interactions"],
  CAROUSEL_ALBUM: ["reach", "likes", "comments", "saved", "shares", "total_interactions"],
  VIDEO: ["reach", "likes", "comments", "saved", "shares", "total_interactions", "views"],
  REELS: ["reach", "likes", "comments", "saved", "shares", "total_interactions", "views"],
};

function getClient(accessToken) {
  const token = accessToken || env.META_INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    const err = new Error(
      "Instagram Graph API access token is missing. Set META_INSTAGRAM_ACCESS_TOKEN in backend/.env.",
    );
    err.status = 503;
    throw err;
  }
  return axios.create({
    baseURL: env.META_INSTAGRAM_GRAPH_BASE,
    timeout: 30_000,
    params: { access_token: token },
  });
}

async function fetchProfile(accessToken) {
  const client = getClient(accessToken);
  // When using graph.facebook.com (page token), /me resolves to the page, not
  // the IG account. Use the explicit IG user ID if configured.
  const igPath = env.META_INSTAGRAM_USER_ID ? `/${env.META_INSTAGRAM_USER_ID}` : "/me";
  const { data } = await client.get(igPath, { params: { fields: PROFILE_FIELDS } });
  return data;
}

/**
 * Page through /me/media until we reach `limit` posts (or the user runs out).
 * Returns raw Graph API items; the caller is responsible for normalization.
 */
async function fetchMedia(accessToken, { limit = 50 } = {}) {
  const client = getClient(accessToken);
  const items = [];
  const igPath = env.META_INSTAGRAM_USER_ID ? `/${env.META_INSTAGRAM_USER_ID}` : "/me";
  let nextUrl = `${igPath}/media`;
  let nextParams = { fields: DEFAULT_FIELDS, limit: Math.min(limit, 100) };

  while (items.length < limit && nextUrl) {
    // After the first hop the `next` URL is absolute and already contains the
    // access token + fields, so we strip params on subsequent calls.
    const { data } = await client.get(nextUrl, nextParams ? { params: nextParams } : {});
    const batch = Array.isArray(data?.data) ? data.data : [];
    items.push(...batch);
    if (items.length >= limit) break;
    if (!data?.paging?.next) break;
    nextUrl = data.paging.next;
    nextParams = null;
  }

  return items.slice(0, limit);
}

async function fetchMediaInsights(mediaId, mediaType, accessToken) {
  const client = getClient(accessToken);
  const upper = String(mediaType || "IMAGE").toUpperCase();
  const metrics = INSIGHT_METRICS[upper] || INSIGHT_METRICS.IMAGE;
  try {
    const { data } = await client.get(`/${mediaId}/insights`, {
      params: { metric: metrics.join(",") },
    });
    return reduceInsights(data?.data || []);
  } catch (err) {
    // A 400 on a single post (e.g. story expired, unsupported type) shouldn't
    // abort the whole sync — return empty metrics and let the caller continue.
    return { _error: err.response?.data?.error?.message || err.message };
  }
}

async function fetchMediaComments(mediaId, accessToken, { limit = 50 } = {}) {
  const client = getClient(accessToken);
  try {
    const { data } = await client.get(`/${mediaId}/comments`, {
      params: {
        fields: "id,text,timestamp,username,like_count",
        limit: Math.min(Number(limit) || 50, 100),
      },
    });
    return {
      data: Array.isArray(data?.data)
        ? data.data.map((comment) => ({
            id: comment.id,
            text: comment.text || "",
            timestamp: comment.timestamp || null,
            username: comment.username || null,
            like_count: Number(comment.like_count || 0),
          }))
        : [],
    };
  } catch (err) {
    return { _error: err.response?.data?.error?.message || err.message };
  }
}

async function replyToComment(commentId, message, accessToken) {
  const client = getClient(accessToken);
  const { data } = await client.post(`/${commentId}/replies`, null, {
    params: { message },
  });
  return data;
}

async function fetchAccountInsight(metric, { period = "lifetime", accessToken, params = {} } = {}) {
  const client = getClient(accessToken);
  const igPath = env.META_INSTAGRAM_USER_ID ? `/${env.META_INSTAGRAM_USER_ID}` : "/me";
  try {
    const { data } = await client.get(`${igPath}/insights`, {
      params: { metric, period, ...params },
    });
    return reduceAccountInsights(data?.data || []);
  } catch (err) {
    return {
      _error: err.response?.data?.error?.message || err.message,
      metric,
      period,
    };
  }
}

async function fetchFollowerDemographic(breakdown, accessToken) {
  const result = await fetchAccountInsight("follower_demographics", {
    period: "lifetime",
    accessToken,
    params: {
      metric_type: "total_value",
      breakdown,
      timeframe: "last_90_days",
    },
  });

  if (result?._error) return result;
  return { [`follower_demographics_${breakdown}`]: result.follower_demographics || {} };
}

async function fetchAudienceInsights(accessToken) {
  const requests = [
    { key: "follower_demographics_gender", run: () => fetchFollowerDemographic("gender", accessToken) },
    { key: "follower_demographics_age", run: () => fetchFollowerDemographic("age", accessToken) },
    { key: "follower_demographics_city", run: () => fetchFollowerDemographic("city", accessToken) },
    { key: "follower_demographics_country", run: () => fetchFollowerDemographic("country", accessToken) },
    { key: "online_followers", run: () => fetchAccountInsight("online_followers", { period: "lifetime", accessToken }) },
    { key: "reach", run: () => fetchAccountInsight("reach", { period: "day", accessToken }) },
    { key: "views", run: () => fetchAccountInsight("views", { period: "day", accessToken }) },
    { key: "profile_views", run: () => fetchAccountInsight("profile_views", { period: "day", accessToken }) },
    { key: "accounts_engaged", run: () => fetchAccountInsight("accounts_engaged", { period: "day", accessToken }) },
  ];

  const results = await Promise.all(requests.map((request) => request.run()));

  return results.reduce(
    (acc, result, index) => {
      const { key } = requests[index];
      if (result?._error) {
        acc.warnings.push(`graph_metric_unavailable:${key}:${result._error}`);
      } else {
        Object.assign(acc.metrics, result);
      }
      return acc;
    },
    { metrics: {}, warnings: [] },
  );
}

function reduceInsights(rows) {
  const out = {};
  for (const row of rows) {
    const v = row?.values?.[0]?.value;
    if (v == null) continue;
    out[row.name] = typeof v === "object" ? v : Number(v);
  }
  return out;
}

function reduceAccountInsights(rows) {
  const out = {};
  for (const row of rows) {
    const breakdownMap = extractBreakdownMap(row?.total_value);
    if (breakdownMap) {
      out[row.name] = breakdownMap;
      continue;
    }

    const value =
      row?.total_value?.value ??
      (Array.isArray(row?.values) ? row.values[row.values.length - 1]?.value : null) ??
      (Array.isArray(row?.values) ? row.values[0]?.value : null) ??
      null;
    if (value == null) continue;
    out[row.name] = value;
  }
  return out;
}

function extractBreakdownMap(totalValue) {
  const breakdowns = totalValue?.breakdowns;
  if (!Array.isArray(breakdowns) || !breakdowns.length) return null;

  const out = {};
  for (const breakdown of breakdowns) {
    for (const result of breakdown?.results || []) {
      const key = Array.isArray(result.dimension_values)
        ? result.dimension_values.filter(Boolean).join(".")
        : result.dimension_values;
      if (!key) continue;
      out[key] = Number(result.value) || 0;
    }
  }
  return out;
}

function normalizeMediaType(media_type, media_product_type) {
  const t = String(media_type || "").toUpperCase();
  const p = String(media_product_type || "").toUpperCase();
  if (p === "REELS" || t === "REELS") return "reel";
  if (t === "VIDEO") return "video";
  if (t === "CAROUSEL_ALBUM") return "carousel";
  if (t === "IMAGE") return "image";
  return (t || "image").toLowerCase();
}

module.exports = {
  fetchProfile,
  fetchMedia,
  fetchMediaInsights,
  fetchMediaComments,
  replyToComment,
  fetchAudienceInsights,
  normalizeMediaType,
};
