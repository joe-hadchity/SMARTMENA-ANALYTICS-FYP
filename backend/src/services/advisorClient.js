/**
 * Thin HTTP client around the Advisor API.
 *
 * Responsibility: owns the axios instance, base URL, timeout, and error translation.
 * This keeps the surface area small so retries, auth, and timeouts live in one place.
 *
 * Error translation:
 *   - network / DNS failure       -> 503 "Advisor API unreachable"
 *   - timeout                      -> 504 "Advisor API timed out"
 *   - Advisor responded with 4xx   -> 400 "Advisor API rejected the request"
 *   - Advisor responded with 503   -> 503 "Advisor API is not ready"
 *   - Advisor responded with other 5xx -> 502 "Advisor API error"
 *
 * Every thrown Error carries `.status` and `.details` so the global
 * errorHandler middleware can surface a clean JSON response.
 */

const axios = require("axios");

const env = require("../config/env");
const logger = require("../utils/logger");

// 30 second timeout for typical API calls
const ADVISOR_TIMEOUT_MS = Number(process.env.ADVISOR_API_TIMEOUT_MS) || 30_000;

function assertEnabled() {
  if (!env.ADVISOR_API_ENABLED) {
    const err = new Error(
      "Advisor API is not configured. Set ADVISOR_API_BASE_URL and ADVISOR_CLIENT_ID."
    );
    err.status = 503;
    err.code = "ADVISOR_DISABLED";
    throw err;
  }
}

const client = axios.create({
  baseURL: env.ADVISOR_API_BASE_URL,
  timeout: ADVISOR_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

function wrapAdvisorError(err, endpoint) {
  if (err.response) {
    const upstream = err.response.status;
    let status;
    let message;

    if (upstream === 503) {
      status = 503;
      message = "Advisor API is not ready";
    } else if (upstream >= 400 && upstream < 500) {
      status = 400;
      message = "Advisor API rejected the request";
    } else {
      status = 502;
      message = "Advisor API error";
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
    const wrapped = new Error("Advisor API timed out");
    wrapped.status = 504;
    wrapped.details = { endpoint, timeoutMs: ADVISOR_TIMEOUT_MS };
    return wrapped;
  }

  const wrapped = new Error("Advisor API unreachable");
  wrapped.status = 503;
  wrapped.details = { endpoint, code: err.code, original: err.message };
  return wrapped;
}

/**
 * List campaigns from Advisor API.
 * GET /api/clients/{clientId}/campaigns
 *
 * @param {{ status?: string, limit?: number }} options
 * @returns {Promise<{ data: Array }>}
 */
async function listCampaigns({ status, limit } = {}) {
  assertEnabled();

  const params = {};
  if (status) params.status = status;
  if (limit) params.limit = limit;

  try {
    const { data } = await client.get(
      `/api/clients/${env.ADVISOR_CLIENT_ID}/campaigns`,
      { params }
    );
    return data;
  } catch (err) {
    logger.error("Advisor /campaigns failed:", err.message);
    throw wrapAdvisorError(err, "/campaigns");
  }
}

/**
 * Get campaign details from Advisor API.
 * GET /api/clients/{clientId}/campaigns/{campaignId}
 *
 * @param {string} campaignId
 * @returns {Promise<Object>}
 */
async function getCampaignDetails(campaignId) {
  assertEnabled();

  try {
    const { data } = await client.get(
      `/api/clients/${env.ADVISOR_CLIENT_ID}/campaigns/${campaignId}`
    );
    return data;
  } catch (err) {
    logger.error(`Advisor /campaigns/${campaignId} failed:`, err.message);
    throw wrapAdvisorError(err, `/campaigns/${campaignId}`);
  }
}

/**
 * Get campaign insights from Advisor API.
 * GET /api/clients/{clientId}/campaigns/{campaignId}/insights
 *
 * @param {string} campaignId
 * @param {{ dateRange?: string, dateStart?: string, dateStop?: string }} options
 * @returns {Promise<Object>}
 */
async function getCampaignInsights(campaignId, { dateRange, dateStart, dateStop } = {}) {
  assertEnabled();

  const params = {};
  if (dateRange) params.date_range = dateRange;
  if (dateStart) params.date_start = dateStart;
  if (dateStop) params.date_stop = dateStop;

  try {
    const { data } = await client.get(
      `/api/clients/${env.ADVISOR_CLIENT_ID}/campaigns/${campaignId}/insights`,
      { params }
    );
    return data;
  } catch (err) {
    logger.error(`Advisor /campaigns/${campaignId}/insights failed:`, err.message);
    throw wrapAdvisorError(err, `/campaigns/${campaignId}/insights`);
  }
}

/**
 * List ad sets for a campaign from Advisor API.
 * GET /api/clients/{clientId}/campaigns/{campaignId}/adsets
 *
 * @param {string} campaignId
 * @returns {Promise<{ data: Array }>}
 */
async function listAdSets(campaignId) {
  assertEnabled();

  try {
    const { data } = await client.get(
      `/api/clients/${env.ADVISOR_CLIENT_ID}/campaigns/${campaignId}/adsets`
    );
    return data;
  } catch (err) {
    logger.error(`Advisor /campaigns/${campaignId}/adsets failed:`, err.message);
    throw wrapAdvisorError(err, `/campaigns/${campaignId}/adsets`);
  }
}

/**
 * Get ad set details from Advisor API.
 * GET /api/clients/{clientId}/campaigns/{campaignId}/adsets/{adsetId}
 *
 * @param {string} campaignId
 * @param {string} adsetId
 * @returns {Promise<Object>}
 */
async function getAdSetDetails(campaignId, adsetId) {
  assertEnabled();

  try {
    const { data } = await client.get(
      `/api/clients/${env.ADVISOR_CLIENT_ID}/campaigns/${campaignId}/adsets/${adsetId}`
    );
    return data;
  } catch (err) {
    logger.error(`Advisor /campaigns/${campaignId}/adsets/${adsetId} failed:`, err.message);
    throw wrapAdvisorError(err, `/campaigns/${campaignId}/adsets/${adsetId}`);
  }
}

/**
 * List ads for an ad set from Advisor API.
 * GET /api/clients/{clientId}/campaigns/{campaignId}/adsets/{adsetId}/ads
 *
 * @param {string} campaignId
 * @param {string} adsetId
 * @returns {Promise<{ data: Array }>}
 */
async function listAds(campaignId, adsetId) {
  assertEnabled();

  try {
    const { data } = await client.get(
      `/api/clients/${env.ADVISOR_CLIENT_ID}/campaigns/${campaignId}/adsets/${adsetId}/ads`
    );
    return data;
  } catch (err) {
    logger.error(`Advisor /campaigns/${campaignId}/adsets/${adsetId}/ads failed:`, err.message);
    throw wrapAdvisorError(err, `/campaigns/${campaignId}/adsets/${adsetId}/ads`);
  }
}

/**
 * Get ad details from Advisor API.
 * GET /api/clients/{clientId}/campaigns/{campaignId}/adsets/{adsetId}/ads/{adId}
 *
 * @param {string} campaignId
 * @param {string} adsetId
 * @param {string} adId
 * @returns {Promise<Object>}
 */
async function getAdDetails(campaignId, adsetId, adId) {
  assertEnabled();

  try {
    const { data } = await client.get(
      `/api/clients/${env.ADVISOR_CLIENT_ID}/campaigns/${campaignId}/adsets/${adsetId}/ads/${adId}`
    );
    return data;
  } catch (err) {
    logger.error(`Advisor /campaigns/${campaignId}/adsets/${adsetId}/ads/${adId} failed:`, err.message);
    throw wrapAdvisorError(err, `/campaigns/${campaignId}/adsets/${adsetId}/ads/${adId}`);
  }
}

module.exports = {
  client,
  listCampaigns,
  getCampaignDetails,
  getCampaignInsights,
  listAdSets,
  getAdSetDetails,
  listAds,
  getAdDetails,
  isEnabled: () => env.ADVISOR_API_ENABLED,
};
