/**
 * topicLabeler -- cheap, keyword-first topic labelling.
 *
 * Layer 1 goal: turn a caption into ONE topic slug (e.g. "fashion",
 * "food_review", "ramadan_content") without calling the LLM for every post.
 *
 * Approach:
 *   1. Keyword rules (bilingual EN + AR). These cover the vast majority of
 *      SME/startup captions in MENA and are deterministic -- ideal for
 *      stable trend aggregation.
 *   2. If no keyword hit AND Azure OpenAI is enabled, optionally fall back
 *      to a tiny single-turn LLM call. We cache by `caption_hash` so the
 *      LLM is asked at most once per caption.
 *   3. If still unknown, return "other".
 *
 * We keep the taxonomy small and MENA-flavored; adding more buckets is
 * additive.
 */

const crypto = require("crypto");

const azure = require("../llm/azureOpenAIClient");
const logger = require("../../utils/logger");

// ---------------------------------------------------------------------------
// Taxonomy + keyword rules
// ---------------------------------------------------------------------------
// Each bucket has { slug, display, keywords: RegExp[] }.
// Keywords combine English + Arabic. Word boundaries are loose on purpose --
// Arabic words don't use Latin boundaries.
// ---------------------------------------------------------------------------

const TOPICS = [
  {
    slug: "ramadan",
    display: "Ramadan",
    keywords: [
      /\bramadan\b/i,
      /\biftar\b/i,
      /\bsuhoor\b/i,
      /رمضان/u,
      /إفطار/u,
      /سحور/u,
    ],
  },
  {
    slug: "eid",
    display: "Eid",
    keywords: [/\beid\b/i, /\bmubarak\b/i, /عيد/u],
  },
  {
    slug: "national_day",
    display: "National day",
    keywords: [
      /national day/i,
      /\bksa\b/i,
      /\buae\b/i,
      /اليوم الوطني/u,
      /العيد الوطني/u,
    ],
  },
  {
    slug: "fashion",
    display: "Fashion",
    keywords: [
      /\boutfit\b/i,
      /\bfashion\b/i,
      /\bstyle\b/i,
      /\blookbook\b/i,
      /موضة/u,
      /أزياء/u,
      /ستايل/u,
    ],
  },
  {
    slug: "beauty",
    display: "Beauty",
    keywords: [
      /\bmakeup\b/i,
      /\bskincare\b/i,
      /\bbeauty\b/i,
      /\bgrwm\b/i,
      /مكياج/u,
      /عناية/u,
      /جمال/u,
    ],
  },
  {
    slug: "food_review",
    display: "Food & restaurants",
    keywords: [
      /\brestaurant\b/i,
      /\bfoodie\b/i,
      /\brecipe\b/i,
      /\btasting\b/i,
      /\bbrunch\b/i,
      /\bmenu\b/i,
      /مطعم/u,
      /طعام/u,
      /وصفة/u,
      /مأكولات/u,
    ],
  },
  {
    slug: "travel",
    display: "Travel",
    keywords: [
      /\btravel\b/i,
      /\btourism\b/i,
      /\bvisit dubai\b/i,
      /\bvisit abu dhabi\b/i,
      /\briyadh\b/i,
      /\bdoha\b/i,
      /سفر/u,
      /سياحة/u,
    ],
  },
  {
    slug: "fitness",
    display: "Fitness",
    keywords: [/\bgym\b/i, /\bworkout\b/i, /\bfitness\b/i, /رياضة/u, /جيم/u],
  },
  {
    slug: "tech_product",
    display: "Tech & product",
    keywords: [
      /\blaunch\b/i,
      /\bapp\b/i,
      /\bstartup\b/i,
      /\bai\b/i,
      /تطبيق/u,
      /منتج/u,
      /إطلاق/u,
    ],
  },
  {
    slug: "sale_promo",
    display: "Sale & promo",
    keywords: [
      /\bsale\b/i,
      /\bdiscount\b/i,
      /\boffer\b/i,
      /\bpromo\b/i,
      /تخفيض/u,
      /عرض/u,
      /خصم/u,
    ],
  },
  {
    slug: "giveaway",
    display: "Giveaway",
    keywords: [
      /\bgiveaway\b/i,
      /\bwin\b/i,
      /\bcontest\b/i,
      /مسابقة/u,
      /فوز/u,
    ],
  },
  {
    slug: "behind_the_scenes",
    display: "Behind the scenes",
    keywords: [
      /\bbts\b/i,
      /\bbehind the scenes\b/i,
      /\bday in the life\b/i,
      /خلف الكواليس/u,
    ],
  },
  {
    slug: "event",
    display: "Events & launches",
    keywords: [
      /\bevent\b/i,
      /\bexpo\b/i,
      /\bsummit\b/i,
      /\bconference\b/i,
      /فعالية/u,
      /مؤتمر/u,
      /معرض/u,
    ],
  },
];

// ---------------------------------------------------------------------------
// LLM fallback (Azure OpenAI). Used sparingly and cached in-memory.
// ---------------------------------------------------------------------------

const llmCache = new Map(); // caption_hash -> slug
const LLM_CACHE_MAX = 2000;

function captionHash(caption) {
  return crypto
    .createHash("sha1")
    .update(String(caption).slice(0, 500), "utf8")
    .digest("hex");
}

const ALL_SLUGS = TOPICS.map((t) => t.slug).concat(["other"]);

async function llmLabel(caption) {
  if (!azure.isEnabled()) return null;
  const hash = captionHash(caption);
  if (llmCache.has(hash)) return llmCache.get(hash);

  try {
    const res = await azure.chat({
      messages: [
        {
          role: "system",
          content: `You classify short social media captions into exactly one of these topics (respond with the slug only, no extra text): ${ALL_SLUGS.join(
            ", ",
          )}.`,
        },
        { role: "user", content: String(caption).slice(0, 500) },
      ],
      temperature: 0,
      maxTokens: 8,
    });
    const raw = String(res.text || "").trim().toLowerCase().replace(/[`"'.]/g, "");
    const slug = ALL_SLUGS.includes(raw) ? raw : "other";
    if (llmCache.size > LLM_CACHE_MAX) llmCache.clear();
    llmCache.set(hash, slug);
    return slug;
  } catch (err) {
    logger.warn?.(`[topicLabeler] LLM call failed: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Synchronous best-effort label from keyword rules only.
 * Returns { slug, display } or null when no rule hits.
 */
function labelFromKeywords(caption) {
  if (!caption) return null;
  for (const topic of TOPICS) {
    if (topic.keywords.some((re) => re.test(caption))) {
      return { slug: topic.slug, display: topic.display };
    }
  }
  return null;
}

/**
 * Async label with optional LLM fallback. Returns { slug, display }.
 * - `allowLLM` (default true): try Azure when no keyword matches.
 */
async function labelCaption(caption, { allowLLM = true } = {}) {
  const kw = labelFromKeywords(caption);
  if (kw) return kw;
  if (allowLLM) {
    const slug = await llmLabel(caption);
    if (slug) {
      const match = TOPICS.find((t) => t.slug === slug);
      return {
        slug,
        display: match?.display || slugToDisplay(slug),
      };
    }
  }
  return { slug: "other", display: "Other" };
}

function slugToDisplay(slug) {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = {
  TOPICS,
  labelCaption,
  labelFromKeywords,
  slugToDisplay,
  _resetCache: () => llmCache.clear(),
};
