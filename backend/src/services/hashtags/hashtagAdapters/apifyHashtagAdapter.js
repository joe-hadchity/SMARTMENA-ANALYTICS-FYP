const axios = require("axios");
const crypto = require("crypto");

const env = require("../../../config/env");

const APIFY_BASE = "https://api.apify.com/v2";

async function fetchHashtagMedia({ tag, limit } = {}) {
  const cleanTag = normalizeTag(tag);
  if (!env.APIFY_API_TOKEN) {
    return {
      media: [],
      warnings: ["apify_hashtag_skipped:missing_api_token"],
      provider: "apify",
      source_url: instagramHashtagUrl(cleanTag),
    };
  }

  if (!cleanTag) {
    return {
      media: [],
      warnings: ["apify_hashtag_skipped:missing_tag"],
      provider: "apify",
      source_url: null,
    };
  }

  const actorId = actorIdForUrl(env.APIFY_INSTAGRAM_ACTOR_ID);
  const resultsLimit = Math.max(1, Math.min(Number(limit || env.HASHTAG_SCRAPE_LIMIT || 24), 60));
  const sourceUrl = instagramHashtagUrl(cleanTag);
  const warnings = [];

  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/${actorId}/runs`,
      {
        directUrls: [sourceUrl],
        resultsType: "posts",
        resultsLimit,
        addParentData: true,
      },
      {
        timeout: 120_000,
        params: {
          token: env.APIFY_API_TOKEN,
          waitForFinish: 120,
        },
      },
    );

    const run = runRes.data?.data || runRes.data || {};
    if (!["SUCCEEDED", "READY"].includes(run.status)) {
      warnings.push(`apify_hashtag_run_status:${run.status || "unknown"}`);
    }
    if (!run.defaultDatasetId) {
      return {
        media: [],
        warnings: [...warnings, "apify_hashtag_missing_dataset"],
        provider: "apify",
        source_url: sourceUrl,
        actor_id: env.APIFY_INSTAGRAM_ACTOR_ID,
        run_id: run.id || null,
      };
    }

    const itemsRes = await axios.get(`${APIFY_BASE}/datasets/${run.defaultDatasetId}/items`, {
      timeout: 60_000,
      params: {
        token: env.APIFY_API_TOKEN,
        clean: true,
        format: "json",
        limit: Math.max(resultsLimit, 50),
      },
    });

    const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];
    return {
      media: items.map((item) => normalizeApifyMedia(item, cleanTag)).filter(Boolean).slice(0, resultsLimit),
      warnings,
      provider: "apify",
      source_url: sourceUrl,
      actor_id: env.APIFY_INSTAGRAM_ACTOR_ID,
      run_id: run.id || null,
      dataset_id: run.defaultDatasetId || null,
      raw_count: items.length,
    };
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || err.message;
    return {
      media: [],
      warnings: [`apify_hashtag_failed:${status || err.code || message}`],
      provider: "apify",
      source_url: sourceUrl,
      actor_id: env.APIFY_INSTAGRAM_ACTOR_ID,
    };
  }
}

function normalizeApifyMedia(item = {}, tag = "") {
  if (item.error) return null;

  const shortcode = firstString(item.shortCode, item.shortcode, item.code);
  const url = firstString(
    item.url,
    item.postUrl,
    item.link,
    shortcode ? `https://www.instagram.com/p/${shortcode}/` : null,
  );
  const id = firstString(item.id, item.pk, shortcode, hashObject(item));
  if (!id || !url) return null;

  const caption = firstString(
    item.caption,
    item.text,
    item.description,
    item.edge_media_to_caption?.edges?.[0]?.node?.text,
  );
  const likes = firstNumber(item.likesCount, item.likes, item.likeCount);
  const comments = firstNumber(item.commentsCount, item.comments, item.commentCount);
  const videoViews = firstNumber(item.videoViewCount, item.videoViews, item.videoPlayCount, item.playCount);

  return {
    id: String(id).slice(0, 180),
    shortcode,
    title: firstString(item.title, item.ownerUsername, item.owner?.username, `#${tag}`),
    caption,
    url,
    author: firstString(item.ownerUsername, item.owner?.username, item.username, item.user?.username),
    published_at: normalizeDate(firstString(item.timestamp, item.takenAtTimestamp, item.createdAt, item.date)),
    media_type: normalizeMediaType(firstString(item.type, item.productType, item.mediaType, item.__typename)),
    media_url: firstString(item.displayUrl, item.imageUrl, item.images?.[0]?.url, item.thumbnailUrl, item.videoUrl),
    hashtags: normalizeHashtags(item.hashtags, caption),
    metrics: {
      likes,
      comments,
      shares: firstNumber(item.sharesCount, item.shares),
      saves: firstNumber(item.savesCount, item.saves),
      video_views: videoViews,
      engagement: Number(likes || 0) + Number(comments || 0),
    },
    raw_payload: {
      ...item,
      provider: "apify",
      source: "apify_hashtag",
      scraped_tag: tag,
    },
  };
}

function normalizeTag(tag = "") {
  return String(tag || "")
    .replace(/^#+/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "");
}

function instagramHashtagUrl(tag) {
  return tag ? `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/` : null;
}

function normalizeMediaType(value = "") {
  const lower = String(value || "").toLowerCase();
  if (lower.includes("sidecar") || lower.includes("carousel")) return "carousel";
  if (lower.includes("reel")) return "reel";
  if (lower.includes("video")) return "video";
  if (lower.includes("image") || lower.includes("photo") || lower.includes("graphimage")) return "image";
  return "image";
}

function normalizeHashtags(input, caption) {
  const fromArray = Array.isArray(input) ? input : [];
  const fromCaption = String(caption || "").match(/#[\p{L}\p{N}_]+/gu) || [];
  return [
    ...new Set(
      [...fromArray, ...fromCaption]
        .map((tag) => String(tag).replace(/^#/, "").toLowerCase().trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeDate(value) {
  if (!value) return null;
  if (Number.isFinite(Number(value))) {
    const number = Number(value);
    const millis = number > 10_000_000_000 ? number : number * 1000;
    return new Date(millis).toISOString();
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function firstString(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function firstNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const number = Number(String(value).replace(/,/g, ""));
    if (Number.isFinite(number)) return Math.round(number);
  }
  return null;
}

function hashObject(value) {
  return crypto.createHash("sha1").update(JSON.stringify(value || {})).digest("hex");
}

function actorIdForUrl(actorId) {
  return encodeURIComponent(String(actorId || "apify/instagram-scraper").replace("/", "~"));
}

module.exports = {
  fetchHashtagMedia,
  normalizeTag,
  instagramHashtagUrl,
};
