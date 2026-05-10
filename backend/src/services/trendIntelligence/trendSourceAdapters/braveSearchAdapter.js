const axios = require("axios");

const env = require("../../../config/env");
const {
  extractHashtags,
  inferLocation,
  inferPlatform,
  normalizeMediaType,
} = require("../trendTextUtils");

const BRAVE_BASE = "https://api.search.brave.com/res/v1";

async function collect({ context, scope = "micro", limit = 40 }) {
  if (!env.BRAVE_SEARCH_API_KEY) {
    return {
      evidence: [],
      warnings: ["brave_search_skipped:missing_api_key"],
    };
  }

  const warnings = [];
  const queries = buildQueries(context, scope).slice(0, 5);
  const perQuery = Math.max(3, Math.ceil(limit / Math.max(1, queries.length)));
  const evidence = [];

  for (const query of queries) {
    const [web, news, videos] = await Promise.all([
      braveRequest("web/search", query, perQuery, warnings),
      braveRequest("news/search", query, Math.min(5, perQuery), warnings),
      braveRequest("videos/search", query, Math.min(5, perQuery), warnings),
    ]);
    evidence.push(
      ...normalizeWebResults(web, query, context, scope).filter((item) =>
        isRelevantResult(item, context, scope),
      ),
      ...normalizeNewsResults(news, query, context, scope).filter((item) =>
        isRelevantResult(item, context, scope),
      ),
      ...normalizeVideoResults(videos, query, context, scope).filter((item) =>
        isRelevantResult(item, context, scope),
      ),
    );
  }

  return {
    evidence: dedupeByUrl(evidence).slice(0, limit),
    warnings,
  };
}

async function braveRequest(endpoint, q, count, warnings) {
  try {
    const res = await axios.get(`${BRAVE_BASE}/${endpoint}`, {
      timeout: 12_000,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY,
      },
      params: {
        q,
        count,
        search_lang: env.TREND_SEARCH_LANG || "en",
        country: env.TREND_SEARCH_COUNTRY || undefined,
        freshness: "pm",
        safesearch: "moderate",
      },
    });
    return res.data || {};
  } catch (err) {
    const status = err.response?.status;
    warnings.push(`brave_${endpoint.replace("/", "_")}_failed:${status || err.code || err.message}`);
    return {};
  }
}

function normalizeWebResults(payload, query, context, scope) {
  const rows = payload.web?.results || payload.results || [];
  return rows.map((row) => resultToEvidence(row, "brave_web", query, context, scope));
}

function normalizeNewsResults(payload, query, context, scope) {
  const rows = payload.results || [];
  return rows.map((row) => resultToEvidence(row, "brave_news", query, context, scope));
}

function normalizeVideoResults(payload, query, context, scope) {
  const rows = payload.results || [];
  return rows.map((row) => resultToEvidence(row, "brave_video", query, context, scope));
}

function resultToEvidence(row, source, query, context, scope) {
  const title = clean(row.title || row.name || "");
  const caption = clean(row.description || row.snippet || row.extra_snippets?.join(" ") || "");
  const url = row.url || row.profile?.url || null;
  const text = `${title} ${caption} ${url || ""}`;
  return {
    source,
    scope,
    platform: inferPlatform(url, source === "brave_video" ? "video_web" : "web"),
    title,
    caption,
    url,
    author: clean(row.profile?.name || row.publisher || row.source || "") || null,
    published_at: parsePublishedAt(row.age || row.page_age || row.date || row.published_time),
    metrics: {
      engagement_total: source === "brave_news" ? 2 : source === "brave_video" ? 4 : 1,
      search_rank: Number(row.rank || 0),
    },
    hashtags: extractHashtags(title, caption),
    media_type: normalizeMediaType(source === "brave_video" ? "video" : null, text),
    location_hint: inferLocation(text, context.location),
    raw_payload: {
      provider: "brave_search",
      query,
      result: row,
    },
  };
}

function buildQueries(context, scope) {
  const category = readableCategory(context.category);
  const location = context.location || "";
  const keywords = context.keywords || [];
  const hashtags = (context.hashtags || []).map((h) => `#${h.replace(/^#/, "")}`);

  if (scope === "macro") {
    return [
      `global ${category} content trends`,
      `outdoor travel reels campaign trends`,
      `${category} youtube vlog trends`,
      `adventure tourism social media formats`,
      `${keywords[0] || category} global trends`,
    ];
  }

  const localPrefix = location ? `${location} ${category}` : category;
  return [
    `${localPrefix} Instagram`,
    `${location} hiking trails weekend`.trim(),
    `group hikes ${location}`.trim(),
    `eco tourism ${location} hiking`.trim(),
    `${hashtags.slice(0, 3).join(" ")} Instagram`.trim(),
  ].filter(Boolean);
}

function readableCategory(category) {
  const value = String(category || "business").replace(/_/g, " ");
  if (value === "hiking group") return "hiking outdoor travel";
  return value;
}

function clean(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePublishedAt(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const text = String(value).toLowerCase();
  const n = Number(text.match(/\d+/)?.[0] || 0);
  if (!n) return null;
  const now = Date.now();
  if (text.includes("hour")) return new Date(now - n * 3_600_000).toISOString();
  if (text.includes("day")) return new Date(now - n * 86_400_000).toISOString();
  if (text.includes("week")) return new Date(now - n * 7 * 86_400_000).toISOString();
  if (text.includes("month")) return new Date(now - n * 30 * 86_400_000).toISOString();
  return null;
}

function dedupeByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.url || `${item.title}:${item.caption}`.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function isRelevantResult(item, context = {}, scope = "micro") {
  const text = [
    item.title,
    item.caption,
    item.url,
    ...(item.hashtags || []),
  ]
    .join(" ")
    .toLowerCase();
  const category = String(context.category || "").toLowerCase();
  const isHiking = /hiking|trail|outdoor|adventure|eco|tourism/.test(category);
  if (!isHiking) return true;

  const positive =
    /(hiking|hike|trail|outdoor|adventure|nature|mountain|camping|trekking|walking route|waterfall|eco.?tour|group hike|lebanon mountain|lebanon trail|instagram\.com)/i;
  const local =
    /(lebanon|beirut|chouf|tannourine|cedars|qadisha|batroun|lebanontrail|hikinglebanon)/i;
  const negative =
    /(price hike|rate hike|tax hike|oil hike|war|hezbollah|israel|israeli|idf|evacuation|strike|missile|illness|celebrity|stock|inflation|salary|rent hike|interest rate)/i;

  if (negative.test(text)) return false;
  if (!positive.test(text)) return false;
  if (scope === "micro" && !local.test(text)) return false;
  return true;
}

module.exports = {
  collect,
  buildQueries,
};
