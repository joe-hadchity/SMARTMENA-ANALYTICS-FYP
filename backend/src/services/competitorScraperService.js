/**
 * competitorScraperService -- pluggable competitor data sources.
 *
 * Three providers are wired up:
 *
 *   1. mock                  -- always available, generates deterministic
 *                               MENA-flavoured posts + metrics. Used for
 *                               demos and tests.
 *   2. business_discovery    -- Instagram Graph API's `ig_hashtag_search`
 *                               /business_discovery lookup. Requires a live
 *                               Meta OAuth connection with the right scopes.
 *   3. ad_library            -- scaffolded wrapper around Meta Ad Library
 *                               (public, unauthenticated). Currently returns
 *                               `{ implemented: false }`; real HTML/graph
 *                               scraping lands in a follow-up.
 *
 * The caller picks a provider via `source`. When a live Meta connection is
 * unavailable we transparently fall back to mock, so the rest of the product
 * (UI, digest worker) keeps working without any branching.
 */

const axios = require("axios");
const crypto = require("crypto");

const env = require("../config/env");
const logger = require("../utils/logger");
const competitorService = require("./competitorService");
const oauthConnectionService = require("./oauth/oauthConnectionService");

const GRAPH_BASE = () => `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the latest N posts + latest account snapshot for a competitor and
 * persist them. Returns a summary the caller can hand to the UI.
 */
async function refreshCompetitor(competitor, { limit = 12 } = {}) {
  if (!competitor) throw new Error("refreshCompetitor: competitor is required");

  const provider = pickProvider(competitor);
  const result = await provider.fetch({ competitor, limit });

  const postSummary = await competitorService.ingestPosts(
    competitor.id,
    result.posts || [],
  );

  // Account-level snapshot (followers).
  if (result.account) {
    await competitorService.ingestSnapshot({
      competitorId: competitor.id,
      scope: "account",
      metrics: {
        followers_count: result.account.followers_count ?? null,
        engagement_rate: result.account.engagement_rate ?? null,
        metadata: result.account.metadata ?? {},
      },
    });
  }

  // Per-post snapshots.
  for (const post of result.posts || []) {
    const persistedPostId = result.postIdMap?.get?.(post.platform_post_id);
    if (!persistedPostId && !post.raw_id) continue;
    if (!post.metrics) continue;
    await competitorService.ingestSnapshot({
      competitorId: competitor.id,
      postId: persistedPostId || null,
      scope: "post",
      metrics: post.metrics,
    });
  }

  await competitorService.touchLastScraped(competitor.id);

  return {
    source: result.source,
    posts_upserted: postSummary.inserted ?? 0,
    followers_count: result.account?.followers_count ?? null,
    used_fallback: result.used_fallback ?? false,
    warnings: result.warnings ?? [],
  };
}

async function refreshAll(workspaceId) {
  const competitors = await competitorService.listCompetitors(workspaceId);
  const results = [];
  for (const c of competitors) {
    try {
      const r = await refreshCompetitor(c);
      results.push({ competitor_id: c.id, handle: c.handle, ...r });
    } catch (err) {
      logger.warn?.(`[competitorScraper] refresh failed for ${c.handle}: ${err.message}`);
      results.push({
        competitor_id: c.id,
        handle: c.handle,
        source: "error",
        error: err.message,
      });
    }
  }
  return results;
}

function pickProvider(competitor) {
  const wanted = competitor.source;
  if (wanted === "business_discovery") return businessDiscoveryProvider;
  if (wanted === "ad_library") return adLibraryProvider;
  return mockProvider;
}

// ---------------------------------------------------------------------------
// Provider: mock (deterministic, MENA-flavoured)
// ---------------------------------------------------------------------------

const MOCK_CAPTIONS_EN = [
  "Ramadan menu drops tonight. Tag your iftar crew.",
  "New arrivals hit the shelves. Who's stopping by first?",
  "Midnight delivery is live across Riyadh. Order now.",
  "Creator of the week: @smartmena_demo. Swipe for their story.",
  "Eid sale: 30% off, 3 days only. Shop in bio.",
  "Behind the scenes: how we design for Gulf summers.",
  "Flash: bilingual support just shipped. AR + EN side by side.",
];
const MOCK_CAPTIONS_AR = [
  "منيو رمضان بيبدأ الليلة. شاركنا جلستك.",
  "تشكيلتنا الجديدة وصلت. مين أول مين يمر؟",
  "توصيل لحد نص الليل بالرياض. اطلبها الآن.",
  "صانع المحتوى لهذا الأسبوع: @smartmena_demo.",
  "عروض العيد: خصم 30% لمدة 3 أيام فقط.",
  "كواليس تصميم منتجاتنا لصيف الخليج.",
  "الدعم بالعربي والإنكليزي صار متوفر.",
];
const MOCK_HASHTAGS_CORE = ["#MENA", "#Startup", "#Instagram"];
const MOCK_HASHTAGS_AR = ["#الرياض", "#دبي", "#مصر", "#رمضان"];

const mockProvider = {
  async fetch({ competitor, limit = 12 }) {
    const out = { source: "mock", posts: [], account: null, used_fallback: false };
    const seedBase = `${competitor.handle}:${competitor.platform}`;
    const posts = [];
    const now = Date.now();

    for (let i = 0; i < limit; i++) {
      const seed = hashSeed(`${seedBase}:${i}`);
      const useArabic = seed % 3 !== 0;
      const captionPool = useArabic ? MOCK_CAPTIONS_AR : MOCK_CAPTIONS_EN;
      const caption = captionPool[seed % captionPool.length];
      const mediaIdx = seed % 4;
      const mediaType = ["image", "carousel", "video", "reel"][mediaIdx];
      const daysAgo = (seed % 14) + i;
      const postedAt = new Date(now - daysAgo * 86_400_000).toISOString();
      const baseLikes = 300 + (seed % 1500);
      const likes = baseLikes + (mediaType === "reel" ? seed % 600 : 0);
      const comments = Math.floor(likes * (0.02 + (seed % 10) / 100));
      const shares = Math.floor(likes * 0.01);
      const reach = likes * (5 + (seed % 4));
      const hashtags = [
        ...MOCK_HASHTAGS_CORE,
        useArabic ? MOCK_HASHTAGS_AR[seed % MOCK_HASHTAGS_AR.length] : null,
      ].filter(Boolean);

      posts.push({
        platform_post_id: `mock_${competitor.id.slice(0, 8)}_${i}`,
        caption,
        caption_lang: useArabic ? (seed % 5 === 0 ? "mixed" : "ar") : "en",
        media_type: mediaType,
        permalink: `https://${providerHost(competitor.platform)}/${competitor.handle}/${i}`,
        posted_at: postedAt,
        hashtags,
        raw_payload: { source: "mock", seed },
        metrics: {
          likes,
          comments,
          shares,
          saves: Math.floor(likes * 0.04),
          impressions: reach * 1.2,
          reach,
          video_views: mediaType === "reel" || mediaType === "video" ? reach * 2 : null,
          engagement_rate: Number(
            ((likes + comments + shares) / Math.max(reach, 1)).toFixed(4),
          ),
        },
      });
    }

    out.posts = posts;
    const followers = 5000 + (hashSeed(seedBase) % 45000);
    out.account = {
      followers_count: followers,
      engagement_rate: 0.035,
      metadata: { generator: "mock", version: 1 },
    };
    return out;
  },
};

// ---------------------------------------------------------------------------
// Provider: Instagram Business Discovery (via an existing Meta OAuth connection)
// ---------------------------------------------------------------------------

const businessDiscoveryProvider = {
  async fetch({ competitor, limit = 12 }) {
    if (!env.META_OAUTH_ENABLED) {
      return withFallback(competitor, limit, [
        "Meta OAuth disabled -- falling back to mock data.",
      ]);
    }
    if (competitor.platform !== "meta_instagram") {
      return withFallback(competitor, limit, [
        `business_discovery only supports Instagram (got platform='${competitor.platform}').`,
      ]);
    }

    const connection = await oauthConnectionService.getConnectionByProvider({
      workspaceId: competitor.workspace_id,
      provider: "meta",
    });
    if (!connection) {
      return withFallback(competitor, limit, [
        "No Meta OAuth connection for this workspace -- falling back to mock data.",
      ]);
    }
    const plaintext = oauthConnectionService.extractPlaintext(connection);
    if (!plaintext?.accessToken) {
      return withFallback(competitor, limit, [
        "Meta OAuth connection is missing an access token.",
      ]);
    }

    const igUserId = connection.metadata?.ig_user_id;
    if (!igUserId) {
      return withFallback(competitor, limit, [
        "ig_user_id missing in oauth_connections.metadata; connect an Instagram Business account.",
      ]);
    }

    try {
      const res = await axios.get(`${GRAPH_BASE()}/${igUserId}`, {
        params: {
          access_token: plaintext.accessToken,
          fields: `business_discovery.username(${competitor.handle}){id,username,name,followers_count,follows_count,media_count,profile_picture_url,media.limit(${limit}){id,caption,media_type,media_product_type,permalink,timestamp,media_url,thumbnail_url,like_count,comments_count}}`,
        },
        timeout: 20_000,
      });
      const bd = res.data?.business_discovery;
      if (!bd) {
        return withFallback(competitor, limit, [
          "business_discovery returned no payload -- account may be private.",
        ]);
      }

      const posts = (bd.media?.data || []).map((m) => {
        const likes = Number(m.like_count) || 0;
        const comments = Number(m.comments_count) || 0;
        return {
          platform_post_id: m.id,
          caption: m.caption || null,
          caption_lang: detectCaptionLang(m.caption),
          media_type: normalizeMediaType(m),
          permalink: m.permalink || null,
          posted_at: m.timestamp || null,
          hashtags: extractHashtags(m.caption),
          raw_payload: m,
          metrics: {
            likes,
            comments,
            engagement_rate: null, // no reach here without user-insights scope
          },
        };
      });

      return {
        source: "business_discovery",
        posts,
        account: {
          followers_count: bd.followers_count ?? null,
          engagement_rate: null,
          metadata: {
            followers_count: bd.followers_count ?? null,
            follows_count: bd.follows_count ?? null,
            media_count: bd.media_count ?? null,
            profile_picture_url: bd.profile_picture_url ?? null,
            business_discovery_username: bd.username ?? null,
          },
        },
      };
    } catch (err) {
      const message =
        err.response?.data?.error?.message || err.message || "Graph error";
      logger.warn?.(`[competitorScraper] business_discovery failed: ${message}`);
      return withFallback(competitor, limit, [
        `business_discovery failed: ${message}`,
      ]);
    }
  },
};

// ---------------------------------------------------------------------------
// Provider: Meta Ad Library (public, no OAuth)
// ---------------------------------------------------------------------------

const adLibraryProvider = {
  async fetch({ competitor, limit }) {
    // Real integration will hit https://graph.facebook.com/v19.0/ads_archive
    // which requires an App Access Token + ad-library-only scope. For the
    // beta we surface a well-formed warning and fall back to mock so the
    // rest of the product keeps working.
    return withFallback(competitor, limit, [
      "ad_library scraper is scaffolded but not yet implemented -- returning mock data.",
    ]);
  },
};

async function withFallback(competitor, limit, warnings) {
  const mock = await mockProvider.fetch({ competitor, limit });
  mock.used_fallback = true;
  mock.warnings = [...(mock.warnings ?? []), ...warnings];
  return mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashSeed(str) {
  const h = crypto.createHash("md5").update(String(str)).digest();
  return h.readUInt32BE(0);
}

function providerHost(platform) {
  if (platform === "meta_facebook") return "facebook.com";
  if (platform === "tiktok") return "tiktok.com";
  if (platform === "x") return "x.com";
  return "instagram.com";
}

function detectCaptionLang(caption) {
  if (!caption) return null;
  const arabic = /[\u0600-\u06FF]/.test(caption);
  const latin = /[A-Za-z]/.test(caption);
  if (arabic && latin) return "mixed";
  if (arabic) return "ar";
  if (latin) return "en";
  return null;
}

function normalizeMediaType(m) {
  const mpt = m.media_product_type;
  if (mpt === "REELS") return "reel";
  if (mpt === "STORY") return "story";
  if (m.media_type === "CAROUSEL_ALBUM") return "carousel";
  if (m.media_type === "VIDEO") return "video";
  if (m.media_type === "IMAGE") return "image";
  return null;
}

function extractHashtags(caption) {
  if (!caption) return [];
  const matches = caption.match(/#[\p{L}0-9_]+/gu) || [];
  return Array.from(new Set(matches));
}

module.exports = {
  refreshCompetitor,
  refreshAll,
};
