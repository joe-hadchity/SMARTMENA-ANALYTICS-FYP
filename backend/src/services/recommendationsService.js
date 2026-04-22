/**
 * MENA recommendations.
 *
 * Given a small brief (platform + region, optionally budget + content type),
 * returns a MENA-tailored playbook:
 *
 *   - best posting window (hours, local weekday bias)
 *   - AR/EN language-mix guidance
 *   - nearest MENA event / holiday from our static calendar
 *   - predicted ROI range (reuses /predict-roi via mlClient)
 *
 * Intentionally rule-based + table-driven for the beta. The heuristics below
 * are consistent with published MENA social benchmarks: evening peaks after
 * work (19:00-22:00), extra late-night spike during Ramadan, Arabic-first
 * for GCC Gulf verticals, bilingual for Levant metros and ecommerce.
 */

const path = require("path");
const fs = require("fs");

const mlClient = require("./mlClient");

const EVENTS = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../data/menaEvents.json"), "utf8"),
);

// Region label used by the ROI model (see ml-service/app/schemas.py).
const ROI_REGION_MAP = {
  LB: "Lebanon",
  AE: "UAE",
  SA: "Saudi Arabia",
  EG: "Egypt",
  JO: "Jordan",
};

// Social-platform strings accepted by /predict-roi.
const ROI_PLATFORM_MAP = {
  meta_instagram: "instagram",
  instagram: "instagram",
  meta_facebook: "facebook",
  facebook: "facebook",
  tiktok: "tiktok",
  x: "twitter",
  twitter: "twitter",
};

// Best posting windows (local time, 24h) per region x platform.
// Values are based on public MENA social benchmarks. First entry is the
// primary window, second is the secondary fallback.
const POSTING_WINDOWS = {
  AE: {
    instagram: [{ start: 20, end: 22 }, { start: 13, end: 14 }],
    facebook: [{ start: 21, end: 23 }, { start: 14, end: 16 }],
    tiktok: [{ start: 22, end: 24 }, { start: 19, end: 21 }],
    twitter: [{ start: 12, end: 14 }, { start: 20, end: 22 }],
  },
  SA: {
    instagram: [{ start: 21, end: 23 }, { start: 15, end: 17 }],
    facebook: [{ start: 22, end: 24 }, { start: 14, end: 16 }],
    tiktok: [{ start: 22, end: 24 }, { start: 19, end: 21 }],
    twitter: [{ start: 13, end: 15 }, { start: 20, end: 22 }],
  },
  EG: {
    instagram: [{ start: 19, end: 22 }, { start: 14, end: 16 }],
    facebook: [{ start: 20, end: 23 }, { start: 13, end: 15 }],
    tiktok: [{ start: 21, end: 23 }, { start: 18, end: 20 }],
    twitter: [{ start: 12, end: 14 }, { start: 20, end: 22 }],
  },
  LB: {
    instagram: [{ start: 19, end: 21 }, { start: 13, end: 14 }],
    facebook: [{ start: 20, end: 22 }, { start: 12, end: 14 }],
    tiktok: [{ start: 21, end: 23 }, { start: 18, end: 20 }],
    twitter: [{ start: 12, end: 14 }, { start: 20, end: 22 }],
  },
  JO: {
    instagram: [{ start: 19, end: 22 }, { start: 13, end: 15 }],
    facebook: [{ start: 20, end: 23 }, { start: 14, end: 16 }],
    tiktok: [{ start: 21, end: 23 }, { start: 18, end: 20 }],
    twitter: [{ start: 12, end: 14 }, { start: 20, end: 22 }],
  },
};

// AR/EN split guidance per region. Levant metros skew bilingual, Gulf
// skews Arabic-first, Egypt is Arabic-dominant.
const LANG_MIX = {
  AE: { ar: 60, en: 40, mixedBonusPct: 10 },
  SA: { ar: 75, en: 25, mixedBonusPct: 5 },
  EG: { ar: 85, en: 15, mixedBonusPct: 5 },
  LB: { ar: 50, en: 50, mixedBonusPct: 15 },
  JO: { ar: 70, en: 30, mixedBonusPct: 10 },
};

function normalizePlatform(input) {
  const key = String(input || "").toLowerCase();
  const mapped = ROI_PLATFORM_MAP[key];
  if (!mapped) {
    const err = new Error(`Unsupported platform: ${input}`);
    err.status = 400;
    throw err;
  }
  return mapped;
}

function normalizeRegion(input) {
  const key = String(input || "").toUpperCase();
  if (!ROI_REGION_MAP[key]) {
    const err = new Error(`Unsupported region: ${input}`);
    err.status = 400;
    throw err;
  }
  return key;
}

function findNearestEvent(regionCode, now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const relevant = EVENTS.filter((e) => e.regions.includes(regionCode))
    .map((e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      let distanceDays;
      if (today >= start && today <= end) {
        distanceDays = 0;
      } else if (today < start) {
        distanceDays = Math.ceil((start - today) / (24 * 60 * 60 * 1000));
      } else {
        distanceDays = Math.ceil((today - end) / (24 * 60 * 60 * 1000)) * -1;
      }
      return { ...e, distanceDays };
    })
    // Prefer future / current events; fall back to the most recent past if
    // nothing in the next 365 days is defined.
    .sort((a, b) => {
      const futureA = a.distanceDays >= 0 ? a.distanceDays : Infinity;
      const futureB = b.distanceDays >= 0 ? b.distanceDays : Infinity;
      if (futureA !== futureB) return futureA - futureB;
      return Math.abs(a.distanceDays) - Math.abs(b.distanceDays);
    });

  return relevant[0] || null;
}

function pickPrimaryHour(regionCode, roiPlatform) {
  const windows =
    POSTING_WINDOWS[regionCode] && POSTING_WINDOWS[regionCode][roiPlatform];
  if (!windows || !windows.length) return 20;
  const primary = windows[0];
  return Math.floor((primary.start + primary.end) / 2);
}

/**
 * Build a MENA recommendation bundle.
 *
 * @param {{
 *   platform: string,          // instagram | facebook | tiktok | x | meta_instagram | meta_facebook | twitter
 *   region: string,            // LB | AE | SA | EG | JO
 *   contentType?: string,      // image | video | carousel | reel | story
 *   budget?: number,
 *   audienceSize?: number,
 * }} input
 */
async function getMenaRecommendation(input) {
  const regionCode = normalizeRegion(input.region);
  const roiPlatform = normalizePlatform(input.platform);
  const roiRegion = ROI_REGION_MAP[regionCode];

  const event = findNearestEvent(regionCode);
  const windows = POSTING_WINDOWS[regionCode][roiPlatform];
  const langMix = LANG_MIX[regionCode];

  const holidayFlag = event && event.distanceDays >= 0 && event.distanceDays <= 7 ? 1 : 0;
  const hourGuess = pickPrimaryHour(regionCode, roiPlatform);

  const contentType = input.contentType || "reel";
  const budget = typeof input.budget === "number" ? input.budget : 500;
  const audienceSize =
    typeof input.audienceSize === "number" ? input.audienceSize : 20000;

  let roiRange = null;
  try {
    const ml = await mlClient.predictRoi({
      budget,
      platform: roiPlatform,
      contentType,
      audienceSize,
      postingHour: hourGuess,
      sentimentScore: 0.6,
      holidayFlag,
      region: roiRegion,
    });

    const confidence = Number(ml.confidence_score) || 0.5;
    const roi = Number(ml.predicted_roi) || 0;
    const half = Math.max(0.2, (1 - confidence) * Math.max(Math.abs(roi), 1));
    roiRange = {
      predictedRoi: Number(roi.toFixed(4)),
      predictedEngagement: Number((ml.predicted_engagement || 0).toFixed(4)),
      confidenceScore: Number(confidence.toFixed(4)),
      roiLow: Number((roi - half).toFixed(4)),
      roiHigh: Number((roi + half).toFixed(4)),
    };
  } catch (err) {
    // MENA recommendations must degrade gracefully if the ML service is
    // unavailable: we still return posting windows and calendar info.
    roiRange = {
      predictedRoi: null,
      predictedEngagement: null,
      confidenceScore: null,
      roiLow: null,
      roiHigh: null,
      unavailableReason: err.message,
    };
  }

  return {
    region: regionCode,
    platform: roiPlatform,
    bestPostingWindows: windows.map((w) => ({
      startHour: w.start,
      endHour: w.end,
      label_en: `${w.start}:00-${w.end}:00 local`,
      label_ar: `${w.start}:00-${w.end}:00 بالتوقيت المحلي`,
    })),
    languageMix: {
      arabicPct: langMix.ar,
      englishPct: langMix.en,
      mixedBonusPct: langMix.mixedBonusPct,
      guidance_en:
        langMix.ar >= 70
          ? "Arabic-first creatives outperform. Add English sub-captions for urban audiences."
          : "Bilingual creatives outperform. Arabic hook + English body is a strong pattern.",
      guidance_ar:
        langMix.ar >= 70
          ? "المحتوى العربي يتفوق. أضف ترجمة إنجليزية قصيرة لجذب الجمهور الحضري."
          : "المحتوى ثنائي اللغة يتفوق. افتتاحية عربية ثم متن إنجليزي نمط قوي.",
    },
    nearestEvent: event
      ? {
          id: event.id,
          name_en: event.name_en,
          name_ar: event.name_ar,
          type: event.type,
          startDate: event.startDate,
          endDate: event.endDate,
          distanceDays: event.distanceDays,
          notes_en: event.notes_en,
          notes_ar: event.notes_ar,
        }
      : null,
    holidayFlag,
    suggestedPostingHour: hourGuess,
    roiForecast: roiRange,
  };
}

module.exports = {
  getMenaRecommendation,
  findNearestEvent,
  ROI_REGION_MAP,
  ROI_PLATFORM_MAP,
  EVENTS,
};
