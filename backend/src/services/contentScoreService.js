/**
 * contentScoreService -- explainable, startup-friendly scoring of a caption
 * before the user posts it.
 *
 * Pipeline:
 *   1. Call the existing Arabic sentiment model via mlClient.predictSentiment
 *      (same path the /api/analyze endpoint uses). No ML-service changes.
 *   2. Call the existing ROI model via mlClient.predictRoi with sensible
 *      defaults when the caller only supplies `captionText` + `platform`.
 *      Any ML failure degrades gracefully to null rather than failing the
 *      whole request -- the sentiment verdict and recommendation_text
 *      still come back.
 *   3. Build a short, plain-English + Arabic recommendation_text that
 *      explains WHY (sentiment leans X, ROI forecast is Y, consider Z).
 *   4. Persist the whole thing in `content_scores` (schema_v5) so the AI
 *      layer stays auditable. If schema_v5 hasn't been applied yet, the
 *      endpoint still returns a valid response and logs the persistence
 *      failure -- it does not fail the call.
 */

const mlClient = require("./mlClient");
const db = require("./dbService");
const logger = require("../utils/logger");
const {
  ROI_PLATFORM_MAP,
  ROI_REGION_MAP,
} = require("./recommendationsService");
const menaEngine = require("./menaRecommendationEngine");

const TABLE = "content_scores";

// Defaults used when the caller only supplies captionText + platform.
// They are conservative and map to the values the ROI model was trained
// on (see `ml-service/data/synthetic_campaigns.csv`).
const DEFAULT_BUDGET = 500;
const DEFAULT_AUDIENCE_SIZE = 20_000;
const DEFAULT_POSTING_HOUR = 20;
const DEFAULT_CONTENT_TYPE = "reel";
const DEFAULT_REGION = "AE";

function normalizeRoiPlatform(platform) {
  const key = String(platform || "").toLowerCase();
  return ROI_PLATFORM_MAP[key] || null;
}

function normalizeRoiRegion(region) {
  const key = String(region || "").toUpperCase();
  return ROI_REGION_MAP[key] ? key : DEFAULT_REGION;
}

function sentimentScoreFromLabel(label, confidence) {
  // Map {positive/neutral/negative} + confidence to a [-1, 1]-ish signal
  // for the ROI model's sentiment_score feature. `confidence` is [0, 1].
  const c = Number.isFinite(confidence) ? confidence : 0.5;
  if (label === "positive") return 0.5 + 0.5 * c; // 0.5..1
  if (label === "negative") return 0.5 - 0.5 * c; // 0..0.5
  return 0.5; // neutral
}

// Recommendation text is built by the shared menaRecommendationEngine so
// the tone / ROI / language / posting-hour / format rules live in exactly
// one place (see ./menaRecommendationEngine.js). The engine returns a
// prioritised list of short tips that we render both as a paragraph
// (recommendation_text) and as a structured array for the API response.

/**
 * Score a caption. Input is already validated by the route middleware.
 *
 * @param {{
 *   workspaceId: string,
 *   platform: string,
 *   captionText: string,
 *   region?: string,
 *   contentType?: string,
 *   budget?: number,
 *   audienceSize?: number,
 *   postingHour?: number,
 * }} input
 */
async function scoreContent(input) {
  const {
    workspaceId,
    platform,
    captionText,
    region,
    contentType,
    budget,
    audienceSize,
    postingHour,
  } = input;

  const roiPlatform = normalizeRoiPlatform(platform);
  if (!roiPlatform) {
    const err = new Error(`Unsupported platform: ${platform}`);
    err.status = 400;
    throw err;
  }
  const roiRegionCode = normalizeRoiRegion(region);
  const roiRegion = ROI_REGION_MAP[roiRegionCode];

  // 1. Sentiment (always attempted; surfaces a 503/504 from mlClient if
  //    the ML service is unreachable -- caller can retry).
  const sentimentResult = await mlClient.predictSentiment(captionText);
  const sentiment =
    typeof sentimentResult?.sentiment === "string" ? sentimentResult.sentiment : null;
  const sentimentConfidence =
    typeof sentimentResult?.confidence === "number" ? sentimentResult.confidence : null;

  if (!sentiment || sentimentConfidence == null) {
    const err = new Error("ML service returned an invalid sentiment payload");
    err.status = 502;
    err.details = { received: sentimentResult };
    throw err;
  }

  // 2. ROI (best-effort; degrades gracefully).
  let predictedRoi = null;
  let predictedEngagement = null;
  let confidenceScore = null;
  let roiUnavailableReason = null;

  try {
    const roiResult = await mlClient.predictRoi({
      budget: Number.isFinite(budget) ? budget : DEFAULT_BUDGET,
      platform: roiPlatform,
      contentType: contentType || DEFAULT_CONTENT_TYPE,
      audienceSize: Number.isFinite(audienceSize)
        ? audienceSize
        : DEFAULT_AUDIENCE_SIZE,
      postingHour: Number.isFinite(postingHour) ? postingHour : DEFAULT_POSTING_HOUR,
      sentimentScore: sentimentScoreFromLabel(sentiment, sentimentConfidence),
      holidayFlag: 0,
      region: roiRegion,
    });

    if (Number.isFinite(Number(roiResult?.predicted_roi))) {
      predictedRoi = Number(roiResult.predicted_roi);
      predictedEngagement = Number(roiResult.predicted_engagement);
      confidenceScore = Number(roiResult.confidence_score);
    } else {
      roiUnavailableReason = "ml_service_invalid_payload";
    }
  } catch (err) {
    logger.error?.("ROI prediction failed in contentScoreService:", err.message);
    roiUnavailableReason = err.message || "ml_service_error";
  }

  // 3. Recommendation -- delegate to the shared MENA engine so every
  //    dimension (tone, ROI, language, posting hour, format) is evaluated
  //    the same way here and in GET /api/workspaces/:id/insights.
  const effectiveContentType = contentType || DEFAULT_CONTENT_TYPE;
  const effectivePostingHour = Number.isFinite(postingHour)
    ? postingHour
    : DEFAULT_POSTING_HOUR;
  const languageMix = menaEngine.detectLanguageMix(captionText);

  const tips = menaEngine.generateRecommendations({
    region: roiRegionCode,
    platform: roiPlatform,
    languageMix,
    contentTone: sentiment,
    toneConfidence: sentimentConfidence,
    contentType: effectiveContentType,
    predictedRoi,
    roiConfidence: confidenceScore,
    postingHour: effectivePostingHour,
  });

  const recommendation_text = menaEngine.toRecommendationText(tips, {
    locale: "en",
    max: 3,
  });
  const recommendation_ar = menaEngine.toRecommendationText(tips, {
    locale: "ar",
    max: 3,
  });

  // 4. Persist (best-effort -- if schema_v5 is not yet applied the
  //    response is still returned; we just log and move on).
  const payload = {
    workspace_id: workspaceId,
    platform,
    caption_text: captionText,
    predicted_sentiment: sentiment,
    predicted_roi: predictedRoi,
    confidence_score:
      confidenceScore != null ? Number(Number(confidenceScore).toFixed(4)) : null,
    recommendation_text,
    data: {
      sentimentConfidence,
      predictedEngagement,
      languageMix,
      tips,
      recommendationBilingual: { en: recommendation_text, ar: recommendation_ar },
      inputs: {
        platform,
        region: roiRegionCode,
        contentType: effectiveContentType,
        budget: Number.isFinite(budget) ? budget : DEFAULT_BUDGET,
        audienceSize: Number.isFinite(audienceSize)
          ? audienceSize
          : DEFAULT_AUDIENCE_SIZE,
        postingHour: effectivePostingHour,
      },
      roiUnavailableReason,
    },
  };

  let saved = null;
  try {
    saved = await db.insert(TABLE, payload);
  } catch (err) {
    logger.error?.(
      "content_scores insert failed (schema_v5 may not be applied):",
      err.message,
    );
  }

  return {
    id: saved?.id ?? null,
    workspace_id: workspaceId,
    platform,
    caption_text: captionText,
    predicted_sentiment: sentiment,
    sentiment_confidence: Number(sentimentConfidence.toFixed(4)),
    predicted_roi: predictedRoi,
    predicted_engagement: predictedEngagement,
    confidence_score: confidenceScore,
    language_mix: languageMix,
    recommendation_text,
    recommendation_ar,
    tips,
    created_at: saved?.created_at ?? new Date().toISOString(),
    persisted: Boolean(saved),
    roi_unavailable_reason: roiUnavailableReason,
  };
}

module.exports = {
  TABLE,
  scoreContent,
};
