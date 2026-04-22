/**
 * hashtagExtractor -- unicode-aware hashtag extraction.
 *
 * Handles:
 *   * ASCII hashtags            "#ramadan", "#mena"
 *   * Arabic hashtags           "#رمضان", "#السعودية"
 *   * Mixed (Arabic + latin)    "#ksa2026"
 *   * Underscores and digits    "#eid_shopping2026"
 *
 * Rules:
 *   * A hashtag is `#` followed by >=2 unicode letters/digits/underscore.
 *   * Leading `#` is dropped from the normalized value; UI can re-add it.
 *   * Normalized form is lowercased; `display_label` keeps the original
 *     case / Arabic characters for pretty rendering.
 *
 * This module has NO side effects (no DB, no LLM). It is hot-path safe.
 */

const HASHTAG_RE = /#([\p{L}\p{N}_]{2,})/gu;

/**
 * Extract every hashtag occurrence from a single caption.
 * Returns an array of { value, display } objects (deduped within the caption).
 */
function extract(caption) {
  if (!caption || typeof caption !== "string") return [];
  const seen = new Set();
  const out = [];
  for (const match of caption.matchAll(HASHTAG_RE)) {
    const raw = match[1] || "";
    if (!raw) continue;
    const display = `#${raw}`;
    const value = raw.toLowerCase();
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ value, display });
  }
  return out;
}

/**
 * Extract hashtags from a list of captions, preserving per-caption provenance.
 * Returns:
 *   [{ caption_index, value, display }, ...]
 */
function extractMany(captions) {
  const out = [];
  (captions || []).forEach((c, i) => {
    for (const h of extract(c)) {
      out.push({ caption_index: i, ...h });
    }
  });
  return out;
}

/**
 * Normalize an already-extracted hashtag (e.g. from `competitor_posts.hashtags`
 * array) into the same shape as `extract()` returns. Accepts either "ramadan"
 * or "#ramadan".
 */
function normalizeExisting(tag) {
  if (!tag) return null;
  const raw = String(tag).trim().replace(/^#/, "");
  if (raw.length < 2) return null;
  return { value: raw.toLowerCase(), display: `#${raw}` };
}

module.exports = {
  extract,
  extractMany,
  normalizeExisting,
  HASHTAG_RE,
};
