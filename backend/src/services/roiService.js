/**
 * ROI service: orchestrates an ROI prediction request.
 *
 *   1. Call the FastAPI ML service via mlClient.predictRoi.
 *   2. Persist the result in the predictions Supabase table.
 *   3. Return a compact, camelCase JSON payload to the caller.
 *
 * The controller should stay thin -- all orchestration logic lives here.
 * HTTP transport concerns live in mlClient; raw DB calls live in dbService.
 */

const mlClient = require("./mlClient");
const db = require("./dbService");

const TABLE = "predictions";

/**
 * Run a ROI prediction and store the result.
 *
 * @param {{
 *   campaignId: string,
 *   budget: number,
 *   platform: string,
 *   contentType: string,
 *   audienceSize: number,
 *   postingHour: number,
 *   sentimentScore: number,
 *   holidayFlag: number,
 *   region: string,
 * }} input  Already validated by the route middleware (zod).
 *
 * @returns {Promise<{
 *   campaignId: string,
 *   predictedRoi: number,
 *   predictedEngagement: number,
 *   confidenceScore: number,
 * }>}
 */
async function predictRoi(input) {
  const { campaignId, ...features } = input;

  const mlResult = await mlClient.predictRoi(features);

  // Defensive: coerce and check the ML response shape before we let the
  // value anywhere near the database (the predictions table has a CHECK
  // on confidence_score which would reject bad data anyway, but a 502 with
  // a clear message is friendlier than a PG constraint error).
  const predictedRoi = Number(mlResult?.predicted_roi);
  const predictedEngagement = Number(mlResult?.predicted_engagement);
  const confidenceScore = Number(mlResult?.confidence_score);

  const allFinite = [predictedRoi, predictedEngagement, confidenceScore].every(
    Number.isFinite,
  );
  if (!allFinite) {
    const err = new Error("ML service returned an invalid payload");
    err.status = 502;
    err.details = { received: mlResult };
    throw err;
  }

  const saved = await db.insert(TABLE, {
    campaign_id: campaignId,
    predicted_roi: predictedRoi,
    predicted_engagement: predictedEngagement,
    confidence_score: confidenceScore,
  });

  return {
    campaignId: saved.campaign_id,
    // Supabase returns numeric columns as strings in some driver builds --
    // coerce so the API always emits real JSON numbers.
    predictedRoi: Number(saved.predicted_roi),
    predictedEngagement: Number(saved.predicted_engagement),
    confidenceScore: Number(saved.confidence_score),
  };
}

module.exports = { predictRoi };
