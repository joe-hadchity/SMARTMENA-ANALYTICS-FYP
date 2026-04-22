/**
 * Meta (Instagram / Facebook) mock provider.
 *
 * Implements the provider interface documented in ./types.js without talking
 * to the real Meta Graph API. The goal is to give the product a believable
 * MENA-flavoured data set out of the box: bilingual (Arabic + English)
 * captions, mixed post types, and time-series metrics that "look real" when
 * rendered in the analytics dashboard.
 *
 * This provider is stateless -- every call regenerates its payload. The
 * backend is responsible for persisting results into Supabase.
 *
 * When the real Meta adapter is added, it registers itself under the same
 * keys (`meta_instagram`, `meta_facebook`) in `./index.js` and all callers
 * keep working with zero changes.
 */

const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Deterministic-ish random helpers (seeded so the same handle always gives
// the same dataset, which makes the demo repeatable).
// ---------------------------------------------------------------------------

function seedFrom(str) {
  const hash = crypto.createHash("sha256").update(String(str)).digest();
  // 32-bit seed from the first 4 bytes.
  return hash.readUInt32BE(0);
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function randInt(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Bilingual caption pool tuned for MENA SMEs.
// Keep entries short and realistic; each entry has an Arabic and English
// variant so we can also fabricate "mixed" captions.
// ---------------------------------------------------------------------------

const CAPTIONS = [
  {
    ar: "عرض رمضان: خصم 20% على جميع المنتجات حتى نهاية الأسبوع 🌙",
    en: "Ramadan offer: 20% off everything until the end of the week 🌙",
    vertical: "retail",
  },
  {
    ar: "افتتاح فرعنا الجديد في دبي مول! تعالوا وجربوا أشهى الأطباق.",
    en: "Our new branch at Dubai Mall is now open! Come taste our signature dishes.",
    vertical: "fnb",
  },
  {
    ar: "نصيحة اليوم من فريقنا: كيف تختار العطر المناسب لفصل الصيف؟",
    en: "Today's tip from our team: how to pick the right fragrance for summer.",
    vertical: "retail",
  },
  {
    ar: "شراكة جديدة مع فريق محلي موهوب، منتجاتنا صنعت بحب في بيروت.",
    en: "New partnership with a talented local team. Our products are made with love in Beirut.",
    vertical: "services",
  },
  {
    ar: "تخفيضات العيد: وفر حتى 35% على الطلبات فوق 300 درهم.",
    en: "Eid sale: save up to 35% on orders above AED 300.",
    vertical: "ecommerce",
  },
  {
    ar: "قصة نجاح عميل: كيف ساعدناه على مضاعفة مبيعاته خلال 3 أشهر.",
    en: "Client success story: how we helped double their sales in 3 months.",
    vertical: "services",
  },
  {
    ar: "وصفة اليوم: كنافة بالقشطة على الطريقة الدمشقية. مين جربها؟",
    en: "Today's recipe: Damascene-style knafeh with cream. Who has tried it?",
    vertical: "fnb",
  },
  {
    ar: "نحن نوظف! انضم لفريقنا في الرياض، مهندس تسويق رقمي.",
    en: "We are hiring! Join our Riyadh team as a digital marketing engineer.",
    vertical: "services",
  },
  {
    ar: "شكراً لكل عميل وثق فينا خلال الأشهر الماضية 🤍",
    en: "Thank you to every customer who trusted us over the past months 🤍",
    vertical: "retail",
  },
  {
    ar: "جلسة تصوير الجمعة الساعة 7 مساءً في الدوحة، الدعوة عامة.",
    en: "Photoshoot on Friday at 7 PM in Doha — everyone is welcome.",
    vertical: "services",
  },
  {
    ar: "مجموعتنا الجديدة للعباءات، تصاميم عصرية وخامات راقية.",
    en: "Our new abaya collection: modern cuts and premium fabrics.",
    vertical: "retail",
  },
  {
    ar: "اشترك بنشرتنا البريدية واستلم كتابنا المجاني حول التسويق المحلي.",
    en: "Subscribe to our newsletter and get our free guide to local marketing.",
    vertical: "services",
  },
];

const POST_TYPES_INSTAGRAM = ["image", "reel", "carousel", "story", "video"];
const POST_TYPES_FACEBOOK = ["image", "video", "carousel", "text"];

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

function metaMockProvider(providerKey) {
  if (providerKey !== "meta_instagram" && providerKey !== "meta_facebook") {
    throw new Error(`metaMockProvider: unsupported key ${providerKey}`);
  }

  const kindLabel =
    providerKey === "meta_instagram" ? "Instagram" : "Facebook";
  const postTypes =
    providerKey === "meta_instagram" ? POST_TYPES_INSTAGRAM : POST_TYPES_FACEBOOK;

  /**
   * "Connect" a mock account. No OAuth, no tokens. The external_account_id
   * is derived deterministically from the handle so repeat connects return
   * the same row (unique constraint on (workspace_id, provider, external_id)).
   */
  async function connectMock({ handle, displayName } = {}) {
    const resolvedHandle =
      handle ||
      (providerKey === "meta_instagram"
        ? `smartmena_demo_${Math.random().toString(36).slice(2, 7)}`
        : `smartmena.demo.${Math.random().toString(36).slice(2, 7)}`);

    const seed = seedFrom(`${providerKey}:${resolvedHandle}`);
    const rand = mulberry32(seed);

    const externalAccountId = `mock_${providerKey}_${seed.toString(16)}`;
    const avatarHue = randInt(rand, 0, 360);

    return {
      provider: providerKey,
      externalAccountId,
      handle: `@${resolvedHandle}`,
      displayName: displayName || `${kindLabel} Demo (${resolvedHandle})`,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedHandle)}&background=${avatarHue.toString(16).padStart(3, "0")}&color=fff`,
      profileUrl:
        providerKey === "meta_instagram"
          ? `https://instagram.com/${resolvedHandle}`
          : `https://facebook.com/${resolvedHandle}`,
      accessTokenCiphertext: null,
      tokenExpiresAt: null,
      isMock: true,
      metadata: {
        mockSeed: seed,
        kind: kindLabel.toLowerCase(),
        followers: randInt(rand, 1500, 120000),
        following: randInt(rand, 50, 900),
        bio:
          providerKey === "meta_instagram"
            ? "MENA SME demo account — تجربة"
            : "Demo page for MENA SME analytics — صفحة تجريبية",
      },
    };
  }

  async function beginOAuth() {
    return {
      authUrl: "about:blank#mock-oauth-not-implemented",
      state: crypto.randomBytes(8).toString("hex"),
    };
  }

  async function completeOAuth(input) {
    return connectMock(input || {});
  }

  async function fetchAccountInfo(account) {
    // In mock mode we just echo the stored row's fields back as-is.
    return {
      provider: account.provider,
      externalAccountId: account.external_account_id,
      handle: account.handle,
      displayName: account.display_name,
      avatarUrl: account.avatar_url,
      profileUrl: account.profile_url,
      isMock: true,
      metadata: account.metadata || {},
    };
  }

  /**
   * Generate `count` posts for the given mock account. Captions rotate
   * through a bilingual pool; some posts are Arabic-only, some English-only,
   * some "mixed" (first sentence AR, second EN). Posted times are spread
   * across the last `daysBack` days so the analytics charts show a trend.
   */
  async function listPosts(account, { limit = 24, daysBack = 30 } = {}) {
    const seed = seedFrom(`${account.external_account_id}:posts`);
    const rand = mulberry32(seed);

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const posts = [];
    for (let i = 0; i < limit; i += 1) {
      const entry = pick(rand, CAPTIONS);
      const langRoll = rand();
      let caption;
      let captionLang;
      if (langRoll < 0.45) {
        caption = entry.ar;
        captionLang = "ar";
      } else if (langRoll < 0.8) {
        caption = entry.en;
        captionLang = "en";
      } else {
        caption = `${entry.ar}\n\n${entry.en}`;
        captionLang = "mixed";
      }

      const postType = pick(rand, postTypes);
      const postedAt = new Date(
        now - Math.floor(rand() * daysBack * dayMs),
      ).toISOString();

      // Deterministic fake post id from seed + index.
      const externalPostId = `mock_${account.external_account_id}_p${i}`;

      posts.push({
        externalPostId,
        postType,
        caption,
        captionLang,
        mediaUrl:
          postType === "text"
            ? null
            : `https://picsum.photos/seed/${encodeURIComponent(externalPostId)}/800/800`,
        permalink:
          providerKey === "meta_instagram"
            ? `https://instagram.com/p/${externalPostId}`
            : `https://facebook.com/${account.external_account_id}/posts/${externalPostId}`,
        postedAt,
        raw: {
          mock: true,
          provider: providerKey,
          vertical: entry.vertical,
        },
      });
    }

    // Newest first.
    posts.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    return posts;
  }

  /**
   * Generate a realistic-looking metrics snapshot for a post. The numbers
   * depend on post type (reel/video get more views) and on a stable per-post
   * seed so repeated calls trend upwards slightly instead of thrashing.
   */
  async function fetchPostMetrics(account, post) {
    const seed = seedFrom(`${post.external_post_id || post.externalPostId}:metrics`);
    const rand = mulberry32(seed);

    const postType = post.post_type || post.postType || "image";

    const reachBase = {
      reel: [8000, 60000],
      video: [4000, 30000],
      carousel: [2500, 18000],
      image: [1500, 12000],
      story: [800, 7000],
      text: [500, 5000],
    }[postType] || [1000, 10000];

    const reach = randInt(rand, reachBase[0], reachBase[1]);
    const impressions = Math.round(reach * (1 + rand() * 0.6));
    const videoViews =
      postType === "reel" || postType === "video"
        ? Math.round(reach * (0.6 + rand() * 0.5))
        : 0;

    const engagementRateRaw =
      postType === "reel"
        ? 0.04 + rand() * 0.08
        : postType === "carousel"
          ? 0.03 + rand() * 0.06
          : postType === "video"
            ? 0.025 + rand() * 0.05
            : 0.015 + rand() * 0.04;

    const engagements = Math.round(reach * engagementRateRaw);
    const likes = Math.round(engagements * (0.7 + rand() * 0.2));
    const comments = Math.round(engagements * (0.05 + rand() * 0.08));
    const shares = Math.round(engagements * (0.03 + rand() * 0.05));
    const saves =
      postType === "carousel" || postType === "reel"
        ? Math.round(engagements * (0.1 + rand() * 0.1))
        : Math.round(engagements * (0.02 + rand() * 0.04));

    const engagementRate = Math.min(0.9999, engagementRateRaw);

    return {
      capturedAt: new Date().toISOString(),
      likes,
      comments,
      shares,
      saves,
      impressions,
      reach,
      videoViews,
      engagementRate: Number(engagementRate.toFixed(5)),
    };
  }

  return {
    providerKey,
    isMock: true,
    beginOAuth,
    completeOAuth,
    connectMock,
    fetchAccountInfo,
    listPosts,
    fetchPostMetrics,
  };
}

module.exports = metaMockProvider;
