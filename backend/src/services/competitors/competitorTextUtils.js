const IG_RESERVED = new Set([
  "about",
  "accounts",
  "api",
  "developer",
  "explore",
  "help",
  "p",
  "reel",
  "reels",
  "stories",
  "tags",
]);

function normalizeHandle(input = "") {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const fromUrl = extractHandleFromUrl(raw);
  const value = (fromUrl || raw)
    .replace(/^@+/, "")
    .replace(/[?#].*$/, "")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  return value.replace(/[^a-z0-9._]/g, "").slice(0, 80);
}

function extractHandleFromUrl(input = "") {
  try {
    const url = new URL(String(input).startsWith("http") ? input : `https://${input}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (!host.includes("instagram.com")) return "";
    const first = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!first || IG_RESERVED.has(first.toLowerCase())) return "";
    return first;
  } catch {
    return "";
  }
}

function isValidHandle(handle, platform = "meta_instagram") {
  const value = normalizeHandle(handle);
  if (!value) return false;
  if (platform === "meta_instagram") {
    return /^[a-z0-9._]{2,30}$/.test(value) && !IG_RESERVED.has(value);
  }
  return /^[a-z0-9._-]{2,80}$/i.test(value);
}

function profileUrlFor(platform, handle) {
  const clean = normalizeHandle(handle);
  if (platform === "meta_instagram") return `https://www.instagram.com/${clean}/`;
  if (platform === "meta_facebook") return `https://www.facebook.com/${clean}`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${clean}`;
  if (platform === "x") return `https://x.com/${clean}`;
  return null;
}

function extractHashtags(...values) {
  const tags = [];
  for (const value of values) {
    const text = Array.isArray(value) ? value.join(" ") : String(value || "");
    for (const match of text.matchAll(/#([\p{L}\p{N}_]+)/gu)) {
      tags.push(match[1].toLowerCase());
    }
  }
  return [...new Set(tags)];
}

function keywordTokens(...values) {
  return [
    ...new Set(
      values
        .flatMap((value) =>
          String(Array.isArray(value) ? value.join(" ") : value || "")
            .toLowerCase()
            .replace(/https?:\/\/\S+/g, " ")
            .split(/[^a-z0-9\u0600-\u06ff#]+/i),
        )
        .map((value) => value.replace(/^#/, "").trim())
        .filter((value) => value.length >= 3),
    ),
  ];
}

function parseFollowerCount(text = "") {
  const value = String(text || "").toLowerCase();
  const match = value.match(/([\d,.]+)\s*([km])?\s+(?:followers|متابع)/i);
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  return Math.round(base * multiplier);
}

module.exports = {
  extractHashtags,
  isValidHandle,
  keywordTokens,
  normalizeHandle,
  parseFollowerCount,
  profileUrlFor,
};
