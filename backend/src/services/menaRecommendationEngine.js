/**
 * menaRecommendationEngine -- startup-friendly, rule-based recommendation
 * generator shared by the AI layer.
 *
 * Produces short, practical, bilingual tips from a small context object.
 * Tips are modular (one per dimension) and prioritised so callers can
 * pick the first N for a headline or concatenate them into a paragraph.
 *
 * Context dimensions considered:
 *   - region           (LB | AE | SA | EG | JO)
 *   - platform         (instagram | facebook | tiktok | twitter)
 *   - languageMix      ('arabic' | 'english' | 'mixed')
 *   - contentTone      ('positive' | 'neutral' | 'negative')
 *   - toneConfidence   (0..1)
 *   - contentType      ('image' | 'video' | 'carousel' | 'reel' | 'story')
 *   - predictedRoi     (number)
 *   - roiConfidence    (0..1)
 *   - postingHour      (0..23, local)
 *   - engagementRatio  (observed / mean; for per-post insights)
 *
 * Every tip returns `{ dimension, priority, en, ar }` so the rest of the
 * system doesn't need to know the internal generators.
 */

const {
  ROI_PLATFORM_MAP,
  ROI_REGION_MAP,
} = require("./recommendationsService");

// ---------------------------------------------------------------------------
// Region / platform reference data (kept local so this module has no
// dependency on the stateless MENA service's internals).
// ---------------------------------------------------------------------------

// AR vs EN mix guidance by region. Numbers are percentages; `mixedBonusPct`
// is the additional uplift bilingual captions tend to get in that region.
const LANG_MIX = {
  AE: { ar: 60, en: 40, mixedBonusPct: 10 },
  SA: { ar: 75, en: 25, mixedBonusPct: 5 },
  EG: { ar: 85, en: 15, mixedBonusPct: 5 },
  LB: { ar: 50, en: 50, mixedBonusPct: 15 },
  JO: { ar: 70, en: 30, mixedBonusPct: 10 },
};

// Primary local posting windows per region x platform.
const POSTING_WINDOWS = {
  AE: {
    instagram: { start: 20, end: 22 },
    facebook: { start: 21, end: 23 },
    tiktok: { start: 22, end: 24 },
    twitter: { start: 12, end: 14 },
  },
  SA: {
    instagram: { start: 21, end: 23 },
    facebook: { start: 22, end: 24 },
    tiktok: { start: 22, end: 24 },
    twitter: { start: 13, end: 15 },
  },
  EG: {
    instagram: { start: 19, end: 22 },
    facebook: { start: 20, end: 23 },
    tiktok: { start: 21, end: 23 },
    twitter: { start: 12, end: 14 },
  },
  LB: {
    instagram: { start: 19, end: 21 },
    facebook: { start: 20, end: 22 },
    tiktok: { start: 21, end: 23 },
    twitter: { start: 12, end: 14 },
  },
  JO: {
    instagram: { start: 19, end: 22 },
    facebook: { start: 20, end: 23 },
    tiktok: { start: 21, end: 23 },
    twitter: { start: 12, end: 14 },
  },
};

// Visual-first platforms where short-form video typically outperforms
// static imagery for the MENA audiences we target.
const VIDEO_FIRST_PLATFORMS = new Set(["instagram", "tiktok"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeRegion(input) {
  const key = String(input || "").toUpperCase();
  return ROI_REGION_MAP[key] ? key : null;
}

function normalizePlatform(input) {
  const key = String(input || "").toLowerCase();
  return ROI_PLATFORM_MAP[key] || null;
}

function hourBucket(hour) {
  if (!Number.isFinite(hour)) return null;
  // Evening intentionally extends to 23:00 -- 21:00-23:00 is prime social
  // time across MENA (post-dinner in GCC, iftar-adjacent in Ramadan).
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 23) return "evening";
  return "late_night";
}

function hourBucketLabel(bucket, locale = "en") {
  const map = {
    en: {
      morning: "the morning",
      afternoon: "the afternoon",
      evening: "the evening",
      late_night: "late at night",
    },
    ar: {
      morning: "الصباح",
      afternoon: "بعد الظهر",
      evening: "المساء",
      late_night: "وقت متأخر من الليل",
    },
  };
  return map[locale][bucket];
}

/**
 * Classify a caption as 'arabic' | 'english' | 'mixed' based on character
 * composition. Null when the text is empty or non-textual (emoji-only).
 */
function detectLanguageMix(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  if (arabicChars === 0 && latinChars === 0) return null;
  if (arabicChars > 0 && latinChars === 0) return "arabic";
  if (latinChars > 0 && arabicChars === 0) return "english";
  const ratio = arabicChars / (arabicChars + latinChars);
  if (ratio >= 0.7) return "arabic";
  if (ratio <= 0.3) return "english";
  return "mixed";
}

// ---------------------------------------------------------------------------
// Individual tip generators (each returns a tip or null)
// ---------------------------------------------------------------------------

function roiTip(ctx) {
  const { predictedRoi, roiConfidence, platform } = ctx;
  if (!Number.isFinite(predictedRoi)) return null;
  const conf = Math.round((roiConfidence ?? 0) * 100);
  const plat = platform || "this platform";

  if (predictedRoi >= 1.5 && (roiConfidence ?? 0) >= 0.7) {
    return {
      dimension: "roi",
      priority: 10,
      en: `Projected ROI on ${plat} is strong (${predictedRoi.toFixed(2)}x, ${conf}% confidence) — a good candidate to boost.`,
      ar: `العائد المتوقع على ${plat} قوي (${predictedRoi.toFixed(2)}×، بثقة ${conf}٪) — مرشّح جيد للتمويل.`,
    };
  }
  if (predictedRoi >= 1.5 && (roiConfidence ?? 0) < 0.7) {
    return {
      dimension: "roi",
      priority: 9,
      en: `Projected ROI looks strong (${predictedRoi.toFixed(2)}x) but confidence is moderate (${conf}%) — test with a small budget first.`,
      ar: `العائد المتوقع يبدو قوياً (${predictedRoi.toFixed(2)}×) لكن الثقة متوسطة (${conf}٪) — جرّب بميزانية صغيرة أولاً.`,
    };
  }
  if (predictedRoi >= 1) {
    return {
      dimension: "roi",
      priority: 7,
      en: `Projected ROI is acceptable (${predictedRoi.toFixed(2)}x, ${conf}% confidence) — publish, then decide on boost based on early signals.`,
      ar: `العائد المتوقع مقبول (${predictedRoi.toFixed(2)}×، بثقة ${conf}٪) — انشر ثم قرّر التمويل بناءً على المؤشرات المبكرة.`,
    };
  }
  return {
    dimension: "roi",
    priority: 9,
    en: `Projected ROI is below 1x (${predictedRoi.toFixed(2)}x) — rework the hook or creative before scaling spend.`,
    ar: `العائد المتوقع أقل من 1× (${predictedRoi.toFixed(2)}×) — أعِد صياغة الفكرة أو المحتوى قبل زيادة الإنفاق.`,
  };
}

function contentToneTip(ctx) {
  const { contentTone, toneConfidence, predictedRoi, roiConfidence } = ctx;
  if (!contentTone) return null;

  if (contentTone === "negative") {
    const confPct = Math.round((toneConfidence ?? 0) * 100);
    return {
      dimension: "content_tone",
      priority: 9,
      en: `Tone reads negative (${confPct}% confidence) — consider softening the message before publishing.`,
      ar: `النبرة تبدو سلبية (بثقة ${confPct}٪) — فكّر في تلطيف الرسالة قبل النشر.`,
    };
  }
  if (contentTone === "neutral") {
    return {
      dimension: "content_tone",
      priority: 6,
      en: "Neutral tone — adding an emotional hook or clear call-to-action usually lifts engagement.",
      ar: "النبرة محايدة — إضافة لمسة عاطفية أو دعوة واضحة لاتخاذ إجراء عادةً ما ترفع التفاعل.",
    };
  }
  // Positive tone: the nuance depends on ROI confidence — matches the
  // "positive sentiment is strong, but ROI confidence is moderate" example.
  if (contentTone === "positive") {
    if (Number.isFinite(predictedRoi) && (roiConfidence ?? 0) < 0.7) {
      return {
        dimension: "content_tone",
        priority: 8,
        en: "Positive sentiment is strong, but ROI confidence is moderate.",
        ar: "النبرة الإيجابية قوية، لكن ثقة توقع العائد متوسطة.",
      };
    }
    return {
      dimension: "content_tone",
      priority: 5,
      en: "Positive sentiment is strong — lean into the emotional angle.",
      ar: "النبرة الإيجابية قوية — وظّف الجانب العاطفي.",
    };
  }
  return null;
}

function languageMixTip(ctx) {
  const { region, languageMix } = ctx;
  const mix = LANG_MIX[region];
  if (!mix) return null;
  const arHeavy = mix.ar >= 70;

  // Explicit mismatch: caption is English-only in an Arabic-heavy region.
  if (languageMix === "english" && arHeavy) {
    return {
      dimension: "language_mix",
      priority: 8,
      en: "Arabic-led messaging may resonate better for this region.",
      ar: "المحتوى العربي الأساسي قد يتناسب أكثر مع هذه المنطقة.",
    };
  }

  // Arabic-only in a bilingual-heavy market (LB, AE): adding English widens reach.
  if (languageMix === "arabic" && mix.en >= 40) {
    return {
      dimension: "language_mix",
      priority: 6,
      en: `Adding English sub-captions could widen reach in ${region}.`,
      ar: `إضافة ترجمة إنجليزية قصيرة قد توسّع الوصول في ${region}.`,
    };
  }

  // Mixed in an Arabic-heavy market: fine, but lead with Arabic.
  if (languageMix === "mixed" && arHeavy) {
    return {
      dimension: "language_mix",
      priority: 4,
      en: `Keep the Arabic hook first — ${region} audiences engage faster with Arabic-led creatives.`,
      ar: `ابدأ بالافتتاحية العربية — جمهور ${region} يتفاعل أسرع مع المحتوى العربي أولاً.`,
    };
  }

  // Generic guidance when we don't know the caption language.
  if (!languageMix) {
    return {
      dimension: "language_mix",
      priority: 3,
      en: arHeavy
        ? `Arabic-led messaging typically resonates better in ${region}.`
        : `Bilingual captions (AR hook + EN body) tend to perform well in ${region}.`,
      ar: arHeavy
        ? `المحتوى العربي الأساسي عادةً ما يكون أقوى في ${region}.`
        : `الصيغة ثنائية اللغة (افتتاحية عربية + متن إنجليزي) تؤدي بشكل جيد في ${region}.`,
    };
  }

  return null;
}

function postingHourTip(ctx) {
  const { region, platform, postingHour } = ctx;
  if (!Number.isFinite(postingHour)) return null;

  // If we have a best window for this region+platform, check alignment.
  const best = POSTING_WINDOWS[region] && POSTING_WINDOWS[region][platform];

  // If no platform/region info, fall back to "evening wins" which is the
  // MENA-wide heuristic — matches the example output the user asked for.
  if (!best) {
    const bucket = hourBucket(postingHour);
    if (bucket && bucket !== "evening") {
      return {
        dimension: "posting_hour",
        priority: 5,
        en: "This post is likely to perform better in the evening.",
        ar: "هذا المنشور يتوقع أن يحقق تفاعلاً أفضل في المساء.",
      };
    }
    return null;
  }

  // In optimal window: silent (nothing to improve).
  if (postingHour >= best.start && postingHour <= best.end) {
    return null;
  }

  // Off-peak: nudge toward the primary window in a human way.
  const bestBucket = hourBucket(Math.floor((best.start + best.end) / 2));
  const enBucket = hourBucketLabel(bestBucket, "en");
  const arBucket = hourBucketLabel(bestBucket, "ar");

  return {
    dimension: "posting_hour",
    priority: 6,
    en: `This post is likely to perform better in ${enBucket} (around ${best.start}:00 local).`,
    ar: `هذا المنشور يتوقع أن يحقق تفاعلاً أفضل في ${arBucket} (حوالي الساعة ${best.start}:00 بالتوقيت المحلي).`,
  };
}

function contentFormatTip(ctx) {
  const { contentType, platform } = ctx;
  if (!contentType || !platform) return null;

  if (contentType === "image" && VIDEO_FIRST_PLATFORMS.has(platform)) {
    return {
      dimension: "content_format",
      priority: 7,
      en: "Reels may outperform static image posts for this audience.",
      ar: "قد تتفوق الريلز على الصور الثابتة مع هذا الجمهور.",
    };
  }
  if (contentType === "story") {
    return {
      dimension: "content_format",
      priority: 4,
      en: "Stories drive awareness fast but decay within 24h — pair them with a feed post for longevity.",
      ar: "الستوري تبني وعياً سريعاً لكنها تختفي خلال 24 ساعة — اقرنها بمنشور في الفيد لاستمرار الأثر.",
    };
  }
  if (contentType === "carousel") {
    return {
      dimension: "content_format",
      priority: 3,
      en: "Carousels tend to lift saves and shares — lead with the strongest slide first.",
      ar: "الكاروسيل يرفع عادةً معدل الحفظ والمشاركة — ابدأ بالشريحة الأقوى.",
    };
  }
  return null;
}

function engagementTip(ctx) {
  const { engagementRatio } = ctx;
  if (!Number.isFinite(engagementRatio)) return null;

  if (engagementRatio >= 1.5) {
    return {
      dimension: "engagement",
      priority: 8,
      en: "This post is outperforming the baseline — consider boosting it to extend reach.",
      ar: "هذا المنشور يتفوق على المعدل — فكّر في تمويله لتوسيع وصوله.",
    };
  }
  if (engagementRatio <= 0.7) {
    return {
      dimension: "engagement",
      priority: 7,
      en: "This post is underperforming — rework the hook or visuals before re-publishing.",
      ar: "أداء هذا المنشور أقل من المعتاد — أعِد صياغة الافتتاحية أو المحتوى قبل إعادة النشر.",
    };
  }
  return null;
}

function menaEventTip(ctx) {
  const { event } = ctx;
  if (!event || typeof event !== "object") return null;
  const name_en = event.name_en || "an upcoming MENA event";
  const name_ar = event.name_ar || "مناسبة قادمة في المنطقة";
  const days = Number(event.distanceDays);

  if (!Number.isFinite(days)) return null;
  if (days === 0) {
    return {
      dimension: "mena_event",
      priority: 10,
      en: `${name_en} is live today — prioritise topical creatives.`,
      ar: `${name_ar} اليوم — ركّز على المحتوى الموضوعي.`,
    };
  }
  if (days > 0 && days <= 14) {
    return {
      dimension: "mena_event",
      priority: 9,
      en: `Plan creative and budget now — ${name_en} is ${days} day(s) away.`,
      ar: `خطّط للمحتوى والميزانية الآن — ${name_ar} بعد ${days} يوم.`,
    };
  }
  if (days > 14 && days <= 60) {
    return {
      dimension: "mena_event",
      priority: 7,
      en: `Start ideating MENA-relevant content — ${name_en} is ${days} day(s) out.`,
      ar: `ابدأ التفكير في محتوى مناسب للمنطقة — ${name_ar} بعد ${days} يوم.`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run every applicable generator, drop nulls, sort by priority descending.
 * Caller decides how many to show.
 */
function generateRecommendations(input = {}) {
  const ctx = {
    ...input,
    region: normalizeRegion(input.region),
    platform: normalizePlatform(input.platform),
  };

  const generators = [
    roiTip,
    contentToneTip,
    menaEventTip,
    engagementTip,
    postingHourTip,
    contentFormatTip,
    languageMixTip,
  ];

  const tips = [];
  for (const gen of generators) {
    try {
      const tip = gen(ctx);
      if (tip) tips.push(tip);
    } catch {
      // A misbehaving generator should never take down the response.
    }
  }

  tips.sort((a, b) => b.priority - a.priority);
  return tips;
}

/**
 * Render a short paragraph. Keeps things practical by:
 *   - capping at `max` tips (default 3)
 *   - skipping duplicate dimensions
 *   - joining with single spaces so the output is one readable line
 */
function toRecommendationText(tips, { locale = "en", max = 3 } = {}) {
  if (!Array.isArray(tips) || tips.length === 0) return "";

  const seen = new Set();
  const picked = [];
  for (const tip of tips) {
    if (seen.has(tip.dimension)) continue;
    seen.add(tip.dimension);
    picked.push(tip[locale] || tip.en);
    if (picked.length >= max) break;
  }
  return picked.join(" ");
}

module.exports = {
  LANG_MIX,
  POSTING_WINDOWS,
  VIDEO_FIRST_PLATFORMS,
  detectLanguageMix,
  generateRecommendations,
  toRecommendationText,
  // Exported for targeted reuse / testing; not part of the primary surface.
  _generators: {
    roiTip,
    contentToneTip,
    languageMixTip,
    postingHourTip,
    contentFormatTip,
    engagementTip,
    menaEventTip,
  },
};
