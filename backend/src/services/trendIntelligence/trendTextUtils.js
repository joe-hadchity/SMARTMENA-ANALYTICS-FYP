const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "best",
  "by",
  "for",
  "from",
  "how",
  "in",
  "into",
  "is",
  "it",
  "its",
  "new",
  "of",
  "on",
  "or",
  "our",
  "the",
  "this",
  "to",
  "top",
  "with",
  "your",
  "you",
  "we",
]);

const MEDIA_TYPES = new Set(["image", "video", "carousel", "reel", "story", "text"]);

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function extractHashtags(...values) {
  const tags = new Set();
  for (const value of values.flatMap(asArray)) {
    const text = String(value || "");
    for (const match of text.matchAll(/#([\p{L}\p{N}_-]{2,60})/gu)) {
      tags.add(match[1].toLowerCase());
    }
    if (/^[\p{L}\p{N}_-]{2,60}$/u.test(text.replace(/^#/, ""))) {
      tags.add(text.replace(/^#/, "").toLowerCase());
    }
  }
  return [...tags];
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}#@_-]+/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[@#]+/, "").trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function topKeywords(text, extra = [], limit = 12) {
  const counts = new Map();
  for (const token of [...tokenize(text), ...asArray(extra).map((v) => String(v).toLowerCase())]) {
    if (STOPWORDS.has(token) || token.length < 3) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function normalizeMediaType(value, text = "") {
  const raw = String(value || "").toLowerCase();
  if (MEDIA_TYPES.has(raw)) return raw;
  const haystack = `${raw} ${text}`.toLowerCase();
  if (haystack.includes("reel") || haystack.includes("/reel/")) return "reel";
  if (haystack.includes("carousel")) return "carousel";
  if (haystack.includes("story")) return "story";
  if (haystack.includes("video") || haystack.includes("youtube") || haystack.includes("vlog")) return "video";
  if (haystack.includes("photo") || haystack.includes("image")) return "image";
  return "text";
}

function inferPlatform(url = "", fallback = "web") {
  const value = String(url || "").toLowerCase();
  if (value.includes("instagram.com")) return "meta_instagram";
  if (value.includes("facebook.com")) return "meta_facebook";
  if (value.includes("youtube.com") || value.includes("youtu.be")) return "youtube";
  if (value.includes("tiktok.com")) return "tiktok";
  if (value.includes("x.com") || value.includes("twitter.com")) return "x";
  return fallback || "web";
}

function inferLocation(text, fallback) {
  const haystack = String(text || "").toLowerCase();
  const locations = [
    ["lebanon", "Lebanon"],
    ["beirut", "Lebanon"],
    ["chouf", "Lebanon"],
    ["tannourine", "Lebanon"],
    ["batroun", "Lebanon"],
    ["cedars", "Lebanon"],
    ["qadisha", "Lebanon"],
    ["mena", "MENA"],
    ["middle east", "MENA"],
  ];
  const found = locations.find(([needle]) => haystack.includes(needle));
  return found?.[1] || fallback || null;
}

function engagementTotal(metrics = {}) {
  const keys = [
    "likes",
    "comments",
    "shares",
    "saves",
    "reactions",
    "engagement",
    "engagement_total",
  ];
  let total = 0;
  for (const key of keys) {
    const n = Number(metrics[key] || 0);
    if (Number.isFinite(n)) total += n;
  }
  const views = Number(metrics.views || metrics.view_count || metrics.video_views || 0);
  if (Number.isFinite(views)) total += Math.round(views * 0.02);
  return Math.max(0, total);
}

function daysOld(value) {
  if (!value) return 30;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 30;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.min(365, diff / 86_400_000));
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeScope(scope) {
  return scope === "macro" ? "macro" : "micro";
}

module.exports = {
  asArray,
  clamp01,
  daysOld,
  engagementTotal,
  extractHashtags,
  inferLocation,
  inferPlatform,
  normalizeMediaType,
  normalizeScope,
  titleCase,
  tokenize,
  topKeywords,
};
