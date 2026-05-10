const axios = require("axios");
const crypto = require("crypto");

const env = require("../../../config/env");
const { normalizeTag, instagramHashtagUrl } = require("./apifyHashtagAdapter");

function isConfigured() {
  return Boolean(env.META_HASHTAG_ACCESS_TOKEN && env.META_HASHTAG_IG_USER_ID);
}

async function searchHashtag({ query } = {}) {
  const tag = normalizeTag(query);
  if (!tag) {
    return {
      provider: "meta_graph",
      hashtag: null,
      warnings: ["meta_hashtag_search_skipped:missing_query"],
    };
  }
  if (!isConfigured()) {
    return {
      provider: "meta_graph",
      hashtag: null,
      warnings: ["meta_hashtag_search_skipped:missing_META_HASHTAG_ACCESS_TOKEN_or_META_HASHTAG_IG_USER_ID"],
    };
  }

  try {
    const { data } = await client().get(`/${graphVersion()}/ig_hashtag_search`, {
      params: {
        user_id: env.META_HASHTAG_IG_USER_ID,
        q: tag,
        access_token: env.META_HASHTAG_ACCESS_TOKEN,
      },
      timeout: 30_000,
    });
    const row = Array.isArray(data?.data) ? data.data[0] : null;
    if (!row?.id) {
      return {
        provider: "meta_graph",
        hashtag: null,
        warnings: [`meta_hashtag_search_empty:${tag}`],
      };
    }
    return {
      provider: "meta_graph",
      hashtag: {
        id: row.id,
        tag,
        name: row.name || tag,
        source_url: instagramHashtagUrl(tag),
      },
      warnings: [],
      raw_payload: data,
    };
  } catch (err) {
    return {
      provider: "meta_graph",
      hashtag: null,
      warnings: [`meta_hashtag_search_failed:${errorMessage(err)}`],
    };
  }
}

async function fetchHashtagMedia({ tag, limit } = {}) {
  const cleanTag = normalizeTag(tag);
  if (!cleanTag) {
    return {
      media: [],
      warnings: ["meta_hashtag_skipped:missing_tag"],
      provider: "meta_graph",
      source_url: null,
    };
  }
  if (!isConfigured()) {
    return {
      media: [],
      warnings: ["meta_hashtag_skipped:missing_META_HASHTAG_ACCESS_TOKEN_or_META_HASHTAG_IG_USER_ID"],
      provider: "meta_graph",
      source_url: instagramHashtagUrl(cleanTag),
    };
  }

  const search = await searchHashtag({ query: cleanTag });
  if (!search.hashtag?.id) {
    return {
      media: [],
      warnings: search.warnings || [`meta_hashtag_search_empty:${cleanTag}`],
      provider: "meta_graph",
      source_url: instagramHashtagUrl(cleanTag),
    };
  }

  const resultsLimit = Math.max(1, Math.min(Number(limit || env.HASHTAG_SCRAPE_LIMIT || 24), 50));
  const warnings = [...(search.warnings || [])];

  try {
    const [top, recent] = await Promise.all([
      fetchMediaEdge(search.hashtag.id, "top_media", resultsLimit),
      fetchMediaEdge(search.hashtag.id, "recent_media", resultsLimit),
    ]);

    warnings.push(...top.warnings, ...recent.warnings);
    const media = dedupeById([...top.media, ...recent.media])
      .sort((a, b) => Number(b.metrics?.engagement || 0) - Number(a.metrics?.engagement || 0))
      .slice(0, resultsLimit);

    return {
      media,
      warnings,
      provider: "meta_graph",
      source_url: instagramHashtagUrl(cleanTag),
      hashtag_id: search.hashtag.id,
      raw_count: media.length,
    };
  } catch (err) {
    return {
      media: [],
      warnings: [`meta_hashtag_media_failed:${errorMessage(err)}`],
      provider: "meta_graph",
      source_url: instagramHashtagUrl(cleanTag),
      hashtag_id: search.hashtag.id,
    };
  }
}

async function fetchMediaEdge(hashtagId, edge, limit) {
  try {
    const { data } = await client().get(`/${graphVersion()}/${hashtagId}/${edge}`, {
      params: {
        user_id: env.META_HASHTAG_IG_USER_ID,
        fields: [
          "id",
          "caption",
          "media_type",
          "media_url",
          "permalink",
          "timestamp",
          "like_count",
          "comments_count",
          "children{media_url,media_type}",
        ].join(","),
        limit,
        access_token: env.META_HASHTAG_ACCESS_TOKEN,
      },
      timeout: 45_000,
    });
    const rows = Array.isArray(data?.data) ? data.data : [];
    return {
      media: rows.map((item) => normalizeMetaMedia(item, edge)).filter(Boolean),
      warnings: [],
    };
  } catch (err) {
    return {
      media: [],
      warnings: [`meta_hashtag_${edge}_failed:${errorMessage(err)}`],
    };
  }
}

function normalizeMetaMedia(item = {}, edge = "") {
  const url = item.permalink;
  if (!item.id || !url) return null;
  const caption = item.caption || "";
  const likes = numberOrNull(item.like_count);
  const comments = numberOrNull(item.comments_count);
  const mediaUrl = item.media_url || item.children?.data?.[0]?.media_url || null;

  return {
    id: String(item.id),
    shortcode: null,
    title: item.username || edge || "Instagram hashtag media",
    caption,
    url,
    author: item.username || null,
    published_at: normalizeDate(item.timestamp),
    media_type: normalizeMediaType(item.media_type),
    media_url: mediaUrl,
    hashtags: extractHashtags(caption),
    metrics: {
      likes,
      comments,
      shares: null,
      saves: null,
      video_views: null,
      engagement: Number(likes || 0) + Number(comments || 0),
    },
    raw_payload: {
      ...item,
      provider: "meta_graph",
      source: "meta_hashtag",
      edge,
    },
  };
}

function client() {
  return axios.create({
    baseURL: env.META_FACEBOOK_GRAPH_BASE.replace(/\/+$/, ""),
  });
}

function graphVersion() {
  return String(env.META_GRAPH_VERSION || "v22.0").replace(/^\/+/, "");
}

function normalizeMediaType(value = "") {
  const lower = String(value || "").toLowerCase();
  if (lower.includes("carousel")) return "carousel";
  if (lower.includes("video")) return "video";
  if (lower.includes("image")) return "image";
  return lower || "image";
}

function extractHashtags(caption = "") {
  return [
    ...new Set(
      (String(caption).match(/#[\p{L}\p{N}_]+/gu) || [])
        .map((tag) => tag.replace(/^#/, "").toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function dedupeById(rows) {
  const seen = new Set();
  return (rows || []).filter((row) => {
    const key = row.id || crypto.createHash("sha1").update(JSON.stringify(row)).digest("hex");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function errorMessage(err) {
  return String(
    err.response?.data?.error?.message ||
      err.response?.data?.error?.code ||
      err.response?.status ||
      err.code ||
      err.message,
  ).replace(/\s+/g, "_");
}

module.exports = {
  isConfigured,
  searchHashtag,
  fetchHashtagMedia,
};
