const axios = require("axios");
const crypto = require("crypto");

const env = require("../../../config/env");
const { extractHashtags, profileUrlFor } = require("../competitorTextUtils");

const APIFY_BASE = "https://api.apify.com/v2";

async function fetchProfilePosts({ handle, platform = "meta_instagram", limit }) {
  if (!env.APIFY_API_TOKEN) {
    return {
      posts: [],
      warnings: ["apify_skipped:missing_api_token"],
      provider: "apify",
    };
  }

  if (platform !== "meta_instagram") {
    return {
      posts: [],
      warnings: [`apify_skipped:unsupported_platform:${platform}`],
      provider: "apify",
    };
  }

  const warnings = [];
  const actorId = actorIdForUrl(env.APIFY_INSTAGRAM_ACTOR_ID);
  const resultsLimit = Number(limit || env.COMPETITOR_POST_LIMIT || 12);
  const profileUrl = profileUrlFor(platform, handle);

  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/${actorId}/runs`,
      buildActorInput(profileUrl, resultsLimit),
      {
        timeout: 180_000,
        params: {
          token: env.APIFY_API_TOKEN,
          waitForFinish: 180,
        },
      },
    );
    const run = runRes.data?.data || runRes.data || {};
    if (!["SUCCEEDED", "READY"].includes(run.status)) {
      warnings.push(`apify_run_status:${run.status || "unknown"}`);
    }
    if (!run.defaultDatasetId) {
      return { posts: [], warnings: [...warnings, "apify_missing_dataset"], provider: "apify" };
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
      posts: items.map((item) => normalizeApifyPost(item, handle)).filter(Boolean).slice(0, resultsLimit),
      warnings,
      provider: "apify",
      actor_id: env.APIFY_INSTAGRAM_ACTOR_ID,
      run_id: run.id || null,
      dataset_id: run.defaultDatasetId || null,
    };
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || err.message;
    return {
      posts: [],
      warnings: [`apify_failed:${status || err.code || message}`],
      provider: "apify",
      actor_id: env.APIFY_INSTAGRAM_ACTOR_ID,
    };
  }
}

function buildActorInput(profileUrl, resultsLimit) {
  return {
    directUrls: [profileUrl],
    resultsType: "posts",
    resultsLimit,
    addParentData: true,
  };
}

function normalizeApifyPost(item = {}, fallbackHandle = "") {
  // Skip error items returned by the actor (e.g. profile URL resolved as "not_found")
  if (item.error) return null;

  const url = firstString(
    item.url,
    item.postUrl,
    item.link,
    item.displayUrl && item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : null,
  );
  const shortcode = firstString(item.shortCode, item.shortcode, item.code);
  // Must have a shortcode (post-level id) — skip profile-level rows that lack it
  if (!shortcode) return null;
  const id = firstString(item.id, item.pk, shortcode, hashObject(item));
  if (!id) return null;

  const caption = firstString(
    item.caption,
    item.text,
    item.description,
    item.edge_media_to_caption?.edges?.[0]?.node?.text,
  );
  const publishedAt = normalizeDate(firstString(item.timestamp, item.takenAtTimestamp, item.createdAt, item.date));
  const mediaType = normalizeMediaType(firstString(item.type, item.productType, item.mediaType, item.__typename));
  const followers = firstNumber(
    item.ownerFollowersCount,
    item.owner?.followersCount,
    item.owner?.followers,
    item.user?.followersCount,
  );

  const mediaUrl = firstString(
    item.displayUrl,
    item.imageUrl,
    item.images?.[0]?.url,
    item.thumbnailUrl,
    item.videoUrl,
  );

  return {
    platform_post_id: String(id).slice(0, 180),
    caption,
    media_type: mediaType,
    media_url: mediaUrl || null,
    permalink: url || (shortcode ? `https://www.instagram.com/p/${shortcode}/` : null),
    posted_at: publishedAt,
    hashtags: normalizeHashtags(item.hashtags, caption),
    metrics: {
      followers_count: followers,
      likes: firstNumber(item.likesCount, item.likes, item.likeCount),
      comments: firstNumber(item.commentsCount, item.comments, item.commentCount),
      shares: firstNumber(item.sharesCount, item.shares),
      saves: firstNumber(item.savesCount, item.saves),
      impressions: firstNumber(item.impressions),
      reach: firstNumber(item.reach),
      video_views: firstNumber(item.videoViewCount, item.videoViews, item.videoPlayCount, item.playCount),
    },
    raw_payload: {
      ...item,
      provider: "apify",
      source: "apify_instagram",
      actor_id: env.APIFY_INSTAGRAM_ACTOR_ID,
      scraped_handle: fallbackHandle,
    },
  };
}

function normalizeMediaType(value = "") {
  const lower = String(value || "").toLowerCase();
  if (lower.includes("sidecar") || lower.includes("carousel")) return "carousel";
  if (lower.includes("reel")) return "reel";
  if (lower.includes("video")) return "video";
  if (lower.includes("story")) return "story";
  if (lower.includes("image") || lower.includes("photo") || lower.includes("graphimage")) return "image";
  return "image";
}

function normalizeHashtags(input, caption) {
  const fromArray = Array.isArray(input) ? input : [];
  return [...new Set([...fromArray, ...extractHashtags(caption)].map((tag) => String(tag).replace(/^#/, "").toLowerCase()).filter(Boolean))];
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
  fetchProfilePosts,
};
