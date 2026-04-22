/**
 * Thin HTTP client around the FastAPI ML service.
 *
 * Responsibility: owns the axios instance, the base URL, the timeout, and
 * error translation. Nothing else in the backend should call the ML service
 * directly -- keep the surface area small so timeouts, retries, and auth
 * (if added later) live in one place.
 *
 * Error translation:
 *   - network / DNS failure       -> 503 "ML service unreachable"
 *   - timeout                      -> 504 "ML service timed out"
 *   - ML responded with 4xx        -> 400 "ML service rejected the request"
 *   - ML responded with 503        -> 503 "ML service is not ready"
 *   - ML responded with other 5xx  -> 502 "ML service error"
 *
 * Every thrown Error carries `.status` and `.details` so the global
 * errorHandler middleware can surface a clean JSON response.
 */

const axios = require("axios");

const env = require("../config/env");
const logger = require("../utils/logger");

// A generous timeout: the first /predict-sentiment call can take 10-30 s on
// a cold ML service (model download + load). Steady-state calls are <1 s.
const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 60_000;

const client = axios.create({
  baseURL: env.ML_SERVICE_URL,
  timeout: ML_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

function wrapMlError(err, endpoint) {
  if (err.response) {
    const upstream = err.response.status;
    let status;
    let message;

    if (upstream === 503) {
      status = 503;
      message = "ML service is not ready";
    } else if (upstream >= 400 && upstream < 500) {
      status = 400;
      message = "ML service rejected the request";
    } else {
      status = 502;
      message = "ML service error";
    }

    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.details = {
      endpoint,
      upstreamStatus: upstream,
      upstreamBody: err.response.data,
    };
    return wrapped;
  }

  if (err.code === "ECONNABORTED") {
    const wrapped = new Error("ML service timed out");
    wrapped.status = 504;
    wrapped.details = { endpoint, timeoutMs: ML_TIMEOUT_MS };
    return wrapped;
  }

  const wrapped = new Error("ML service unreachable");
  wrapped.status = 503;
  wrapped.details = { endpoint, code: err.code, original: err.message };
  return wrapped;
}

/**
 * Call POST /predict-sentiment on the FastAPI service.
 *
 * @param {string} text  Raw text to analyse.
 * @returns {Promise<{ sentiment: string, confidence: number }>}
 */
async function predictSentiment(text) {
  try {
    const { data } = await client.post("/predict-sentiment", { text });
    return data;
  } catch (err) {
    logger.error("ML /predict-sentiment failed:", err.message);
    throw wrapMlError(err, "/predict-sentiment");
  }
}

/**
 * Call POST /predict-roi on the FastAPI service.
 *
 * Input uses camelCase (the backend's public convention); the ML service
 * expects snake_case. This function is the single place where that naming
 * translation happens, so the rest of the backend never has to think about it.
 *
 * @param {{
 *   budget: number,
 *   platform: string,
 *   contentType: string,
 *   audienceSize: number,
 *   postingHour: number,
 *   sentimentScore: number,
 *   holidayFlag: number,
 *   region: string,
 * }} features
 * @returns {Promise<{
 *   predicted_roi: number,
 *   predicted_engagement: number,
 *   confidence_score: number,
 * }>}
 */
async function predictRoi(features) {
  const payload = {
    budget: features.budget,
    platform: features.platform,
    content_type: features.contentType,
    audience_size: features.audienceSize,
    posting_hour: features.postingHour,
    sentiment_score: features.sentimentScore,
    holiday_flag: features.holidayFlag,
    region: features.region,
  };

  try {
    const { data } = await client.post("/predict-roi", payload);
    return data;
  } catch (err) {
    logger.error("ML /predict-roi failed:", err.message);
    throw wrapMlError(err, "/predict-roi");
  }
}

module.exports = {
  client,
  predictSentiment,
  predictRoi,
};
