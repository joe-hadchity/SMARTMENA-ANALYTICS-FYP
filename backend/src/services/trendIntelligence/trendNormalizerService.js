const {
  engagementTotal,
  extractHashtags,
  inferLocation,
  inferPlatform,
  normalizeMediaType,
  normalizeScope,
  topKeywords,
} = require("./trendTextUtils");

function normalize(items, context = {}) {
  const out = [];
  const seen = new Set();

  for (const item of items || []) {
    const title = cleanText(item.title);
    const caption = cleanText(item.caption);
    const text = [title, caption].filter(Boolean).join(" ");
    if (!text && !item.url) continue;

    const key = (item.url || `${item.source}:${title}:${caption}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const hashtags = extractHashtags(item.hashtags, title, caption);
    const mediaType = normalizeMediaType(item.media_type, `${text} ${item.url || ""}`);
    const metrics = normalizeMetrics(item.metrics);
    const keywords = topKeywords(text, [...hashtags, ...(context.keywords || [])], 14);

    out.push({
      source: item.source || "unknown",
      scope: normalizeScope(item.scope),
      platform: item.platform || inferPlatform(item.url, "web"),
      title: title || null,
      caption: caption || null,
      url: item.url || null,
      author: cleanText(item.author) || null,
      published_at: normalizeDate(item.published_at),
      metrics,
      hashtags,
      media_type: mediaType,
      location_hint: inferLocation(text, item.location_hint || context.location),
      raw_payload: item.raw_payload || {},
      keywords,
      normalized_text: text,
      entities: detectEntities(text, context),
      caption_pattern: detectCaptionPattern(caption || title),
    });
  }

  return out;
}

function normalizeMetrics(metrics = {}) {
  const out = {};
  for (const [key, value] of Object.entries(metrics || {})) {
    const n = Number(value);
    if (Number.isFinite(n)) out[key] = n;
  }
  out.engagement_total = engagementTotal(out);
  return out;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectEntities(text, context = {}) {
  const haystack = String(text || "").toLowerCase();
  const entities = new Set();
  for (const token of [
    context.location,
    ...(context.keywords || []),
    ...(context.hashtags || []),
  ]) {
    const value = String(token || "").replace(/^#/, "").trim();
    if (value && haystack.includes(value.toLowerCase())) entities.add(value);
  }
  const known = [
    "Lebanon",
    "Beirut",
    "Chouf",
    "Tannourine",
    "Cedars",
    "Qadisha",
    "Batroun",
    "waterfall",
    "sunset",
    "trail",
    "reel",
    "community",
  ];
  for (const value of known) {
    if (haystack.includes(value.toLowerCase())) entities.add(value);
  }
  return [...entities].slice(0, 12);
}

function detectCaptionPattern(text) {
  const value = String(text || "").trim();
  if (!value) return "unknown";
  const lower = value.toLowerCase();
  const words = value.split(/\s+/).filter(Boolean).length;
  if (/(join us|book now|register|dm|link in bio|comment|save this|tag)/i.test(value)) {
    return "cta_driven";
  }
  if (/(feel|escape|memory|together|community|friends|weekend|reset|adventure)/i.test(value)) {
    return "emotional_storytelling";
  }
  if (/(where|how|guide|tips|route|trail|what to bring|beginner)/i.test(value)) {
    return "informational_guide";
  }
  if (/(lebanon|beirut|chouf|tannourine|cedars|batroun)/i.test(value.slice(0, 90))) {
    return "location_first";
  }
  if (words <= 18) return "short_hook";
  return "descriptive_caption";
}

module.exports = {
  normalize,
  detectCaptionPattern,
};
