const axios = require("axios");

const env = require("../../../config/env");
const {
  normalizeHandle,
  parseFollowerCount,
  profileUrlFor,
} = require("../competitorTextUtils");

const BRAVE_BASE = "https://api.search.brave.com/res/v1";

async function discover({ context, limit = 12 }) {
  if (!env.BRAVE_SEARCH_API_KEY) {
    return {
      candidates: [],
      warnings: ["brave_search_skipped:missing_api_key"],
    };
  }

  const warnings = [];
  const queries = buildQueries(context).slice(0, 5);
  const perQuery = Math.max(4, Math.ceil(limit / Math.max(1, queries.length)) + 2);
  const rows = [];

  for (const query of queries) {
    const payload = await braveRequest(query, perQuery, warnings);
    rows.push(...normalizeResults(payload, query, context));
  }

  return {
    candidates: dedupeCandidates(rows).slice(0, limit),
    warnings,
  };
}

async function verifyHandle({ platform = "meta_instagram", handle, context }) {
  if (!env.BRAVE_SEARCH_API_KEY) {
    return {
      verified: false,
      evidence: [],
      warnings: ["brave_search_skipped:missing_api_key"],
    };
  }

  const clean = normalizeHandle(handle);
  const profileUrl = profileUrlFor(platform, clean);
  const queries = [
    `site:instagram.com/${clean} "${clean}" Instagram`,
    `"${profileUrl}"`,
  ];
  const warnings = [];
  const evidence = [];

  for (const query of queries) {
    const payload = await braveRequest(query, 5, warnings);
    evidence.push(...normalizeResults(payload, query, { ...context, platform }));
  }

  const matches = evidence.filter((item) => item.handle === clean);
  return {
    verified: matches.length > 0,
    evidence: matches,
    warnings,
  };
}

async function braveRequest(q, count, warnings) {
  try {
    const response = await axios.get(`${BRAVE_BASE}/web/search`, {
      timeout: 12_000,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY,
      },
      params: {
        q,
        count,
        search_lang: env.COMPETITOR_SEARCH_LANG || "en",
        country: env.COMPETITOR_SEARCH_COUNTRY || undefined,
        safesearch: "moderate",
      },
    });
    return response.data || {};
  } catch (err) {
    const status = err.response?.status;
    warnings.push(`brave_web_failed:${status || err.code || err.message}`);
    return {};
  }
}

function buildQueries(context = {}) {
  const location = context.location || "";
  const category = context.category || "business";
  const keywordSeeds = (context.keywords || [])
    .filter((value) => !/^instagram$/i.test(value))
    .slice(0, 8);
  const hashtagSeeds = (context.hashtags || []).slice(0, 5).map((tag) => `#${tag.replace(/^#/, "")}`);
  const base = [
    `${category} ${location}`.trim(),
    ...keywordSeeds,
    ...hashtagSeeds,
  ].filter(Boolean);

  if (context.platform === "meta_instagram") {
    return [
      `site:instagram.com "${category}" "${location}"`,
      `site:instagram.com "${category}" "${location}" "hiking"`,
      `site:instagram.com "${base.slice(0, 4).join('" "')}"`,
      `"Instagram" "${category}" "${location}"`,
      `${category} ${location} instagram groups`,
    ].filter(Boolean);
  }
  return [`${category} ${location} social media`, ...base.map((value) => `${value} social profile`)];
}

function normalizeResults(payload, query, context) {
  const rows = payload.web?.results || payload.results || [];
  return rows
    .map((row) => rowToCandidate(row, query, context))
    .filter(Boolean);
}

function rowToCandidate(row, query, context = {}) {
  const url = row.url || row.profile?.url || "";
  const platform = context.platform || platformFromUrl(url);
  const handle = extractHandle(url, platform);
  if (!handle) return null;

  const title = cleanText(row.title || "");
  const description = cleanText(row.description || row.snippet || "");
  const text = `${title} ${description}`;
  const followerCount = parseFollowerCount(text);

  return {
    platform,
    handle,
    display_name: displayNameFromTitle(title, handle),
    profile_url: profileUrlFor(platform, handle) || url,
    avatar_url: row.thumbnail?.src || null,
    region: context.location || null,
    industry: context.category || null,
    tags: [...new Set([...(context.hashtags || []), ...(context.keywords || []).slice(0, 6)])],
    source: "brave_search",
    evidence: [
      {
        source: "brave_search",
        query,
        title,
        snippet: description,
        url,
        published_at: row.age || null,
      },
    ],
    metrics: {
      followers_count: followerCount,
    },
    raw_payload: row,
  };
}

function platformFromUrl(url) {
  const lower = String(url || "").toLowerCase();
  if (lower.includes("instagram.com")) return "meta_instagram";
  if (lower.includes("facebook.com")) return "meta_facebook";
  if (lower.includes("tiktok.com")) return "tiktok";
  if (lower.includes("x.com") || lower.includes("twitter.com")) return "x";
  return "meta_instagram";
}

function extractHandle(url, platform) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (!parts.length) return "";
    if (platform === "tiktok" && parts[0]?.startsWith("@")) {
      return normalizeHandle(parts[0]);
    }
    if (platform === "meta_instagram") {
      const first = parts[0].toLowerCase();
      if (["p", "reel", "reels", "stories", "explore", "tags", "accounts"].includes(first)) {
        return "";
      }
    }
    return normalizeHandle(parts[0]);
  } catch {
    return "";
  }
}

function displayNameFromTitle(title, handle) {
  const clean = cleanText(title)
    .replace(/\(@[^)]+\)/g, "")
    .replace(/\|.*$/g, "")
    .replace(/instagram.*$/i, "")
    .replace(/photos and videos.*$/i, "")
    .trim();
  return clean || handle;
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeCandidates(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = `${item.platform}:${item.handle}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }
    existing.evidence.push(...item.evidence);
    existing.tags = [...new Set([...(existing.tags || []), ...(item.tags || [])])];
    existing.metrics.followers_count =
      existing.metrics.followers_count || item.metrics.followers_count || null;
  }
  return [...byKey.values()];
}

module.exports = {
  discover,
  verifyHandle,
};
