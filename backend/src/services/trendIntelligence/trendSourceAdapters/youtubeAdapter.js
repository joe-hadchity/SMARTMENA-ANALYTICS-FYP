const axios = require("axios");

const env = require("../../../config/env");
const {
  extractHashtags,
  inferLocation,
  normalizeMediaType,
} = require("../trendTextUtils");

const YOUTUBE_BASE = "https://www.googleapis.com/youtube/v3";

async function collect({ context, scope = "macro", limit = 30 }) {
  if (scope !== "macro") {
    return { evidence: [], warnings: [] };
  }
  if (!env.YOUTUBE_API_KEY) {
    return {
      evidence: [],
      warnings: ["youtube_skipped:missing_api_key"],
    };
  }

  const warnings = [];
  const queries = buildQueries(context).slice(0, 4);
  const ids = new Set();
  const searchRows = [];

  for (const query of queries) {
    const rows = await searchVideos(query, Math.max(5, Math.ceil(limit / queries.length)), warnings);
    for (const row of rows) {
      const id = row.id?.videoId;
      if (!id || ids.has(id)) continue;
      ids.add(id);
      searchRows.push({ query, row, id });
    }
  }

  const detailsById = await loadVideoDetails([...ids], warnings);
  const evidence = searchRows
    .map(({ query, row, id }) => videoToEvidence(row, detailsById.get(id), query, context))
    .filter(Boolean)
    .filter((item) => isRelevantVideo(item, context))
    .slice(0, limit);

  return { evidence, warnings };
}

async function searchVideos(q, maxResults, warnings) {
  try {
    const publishedAfter = new Date(Date.now() - 45 * 86_400_000).toISOString();
    const res = await axios.get(`${YOUTUBE_BASE}/search`, {
      timeout: 12_000,
      params: {
        key: env.YOUTUBE_API_KEY,
        part: "snippet",
        type: "video",
        q,
        maxResults,
        order: "viewCount",
        safeSearch: "moderate",
        publishedAfter,
      },
    });
    return res.data?.items || [];
  } catch (err) {
    warnings.push(`youtube_search_failed:${err.response?.status || err.code || err.message}`);
    return [];
  }
}

async function loadVideoDetails(ids, warnings) {
  const byId = new Map();
  if (!ids.length) return byId;
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const res = await axios.get(`${YOUTUBE_BASE}/videos`, {
        timeout: 12_000,
        params: {
          key: env.YOUTUBE_API_KEY,
          part: "snippet,statistics,contentDetails",
          id: batch.join(","),
        },
      });
      for (const item of res.data?.items || []) {
        byId.set(item.id, item);
      }
    } catch (err) {
      warnings.push(`youtube_videos_failed:${err.response?.status || err.code || err.message}`);
    }
  }
  return byId;
}

function videoToEvidence(searchRow, detail, query, context) {
  const snippet = detail?.snippet || searchRow.snippet || {};
  const stats = detail?.statistics || {};
  const id = detail?.id || searchRow.id?.videoId;
  if (!id) return null;
  const title = snippet.title || "";
  const caption = snippet.description || "";
  const tags = snippet.tags || [];
  return {
    source: "youtube",
    scope: "macro",
    platform: "youtube",
    title,
    caption,
    url: `https://www.youtube.com/watch?v=${id}`,
    author: snippet.channelTitle || null,
    published_at: snippet.publishedAt || null,
    metrics: {
      views: Number(stats.viewCount || 0),
      likes: Number(stats.likeCount || 0),
      comments: Number(stats.commentCount || 0),
      engagement_total:
        Number(stats.likeCount || 0) +
        Number(stats.commentCount || 0) +
        Math.round(Number(stats.viewCount || 0) * 0.02),
    },
    hashtags: extractHashtags(title, caption, tags),
    media_type: normalizeMediaType("video", `${title} ${caption}`),
    location_hint: inferLocation(`${title} ${caption}`, context.location),
    raw_payload: {
      provider: "youtube_data_api",
      query,
      search_row: searchRow,
      detail,
    },
  };
}

function buildQueries(context) {
  const category = String(context.category || "outdoor travel").replace(/_/g, " ");
  const location = context.location || "";
  if (/hiking|outdoor|adventure|trail/i.test(category)) {
    return [
      `${location} hiking`.trim(),
      `best hiking trails ${location}`.trim(),
      `outdoor adventure ${location}`.trim(),
      "global hiking vlog",
      "outdoor travel adventure vlog",
    ];
  }
  return [
    `${category} social media trends`,
    `${category} campaign video`,
    `${category} global content trends`,
  ];
}

function isRelevantVideo(item, context = {}) {
  const text = [item.title, item.caption, item.url, ...(item.hashtags || [])]
    .join(" ")
    .toLowerCase();
  const category = String(context.category || "").toLowerCase();
  const isHiking = /hiking|trail|outdoor|adventure|eco|tourism/.test(category);
  if (!isHiking) return true;

  const positive =
    /(hiking|hike|trail|outdoor|adventure|nature|mountain|camping|trekking|travel vlog|waterfall|eco.?tour)/i;
  const negative =
    /(price hike|rate hike|war|hezbollah|israel|israeli|idf|strike|missile|celebrity|stock|inflation)/i;
  return positive.test(text) && !negative.test(text);
}

module.exports = {
  collect,
  buildQueries,
};
