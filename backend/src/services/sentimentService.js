/**
 * Sentiment service: orchestrates the two side-effects of analysing a post.
 *
 *   1. Call the FastAPI ML service via mlClient.
 *   2. Persist the result in the sentiment_results Supabase table.
 *
 * Each side-effect lives in its own module (mlClient / dbService) so this
 * file stays small and testable. The controller layer should not know about
 * axios or Supabase.
 */

const mlClient = require("./mlClient");
const db = require("./dbService");

const TABLE = "sentiment_results";
const ALLOWED_LABELS = new Set(["positive", "negative", "neutral"]);

/**
 * Analyse a post's text, store the result, and return a compact payload.
 *
 * @param {{ postId: string, text: string }} input
 *        Already validated by the route middleware (zod).
 * @returns {Promise<{ postId: string, sentiment: string, confidence: number }>}
 */
async function analyzeSentiment({ postId, text }) {
  const mlResult = await mlClient.predictSentiment(text);

  // Defensive: make sure the ML service honoured its contract before we let
  // the value anywhere near the database (the sentiment_results CHECK
  // constraint would reject it anyway, but this produces a clearer error).
  const sentiment = typeof mlResult?.sentiment === "string" ? mlResult.sentiment : null;
  const confidence = typeof mlResult?.confidence === "number" ? mlResult.confidence : null;

  if (!sentiment || !ALLOWED_LABELS.has(sentiment) || confidence == null) {
    const err = new Error("ML service returned an invalid payload");
    err.status = 502;
    err.details = { received: mlResult };
    throw err;
  }

  const saved = await db.insert(TABLE, {
    post_id: postId,
    sentiment,
    confidence,
  });

  return {
    postId: saved.post_id,
    sentiment: saved.sentiment,
    // Supabase can return numeric columns as strings depending on the driver
    // version -- coerce so the API always emits a real JSON number.
    confidence: Number(saved.confidence),
  };
}

module.exports = { analyzeSentiment };
