const advisorClient = require("../services/advisorClient");
const env = require("../config/env");

/**
 * List campaigns from Advisor API.
 * GET /api/advisor/campaigns?status=ACTIVE&limit=50
 */
async function listAdvisorCampaigns(req, res) {
  // Graceful fallback when not configured
  if (!env.ADVISOR_API_ENABLED) {
    return res.json({
      _status: "not_configured",
      _note: "Advisor API is not configured. Set ADVISOR_API_BASE_URL and ADVISOR_CLIENT_ID.",
      data: [],
    });
  }

  const { status, limit } = req.query;

  const result = await advisorClient.listCampaigns({
    status,
    limit: limit ? Number(limit) : undefined,
  });

  res.json({
    _status: "live",
    ...result,
  });
}

/**
 * Get campaign details from Advisor API.
 * GET /api/advisor/campaigns/:campaignId
 */
async function getAdvisorCampaignDetails(req, res) {
  // Graceful fallback when not configured
  if (!env.ADVISOR_API_ENABLED) {
    return res.json({
      _status: "not_configured",
      _note: "Advisor API is not configured.",
      data: null,
    });
  }

  const { campaignId } = req.params;

  const result = await advisorClient.getCampaignDetails(campaignId);

  res.json({
    _status: "live",
    data: result,
  });
}

/**
 * Get campaign insights from Advisor API.
 * GET /api/advisor/campaigns/:campaignId/insights?date_range=last_7d
 */
async function getAdvisorCampaignInsights(req, res) {
  // Graceful fallback when not configured
  if (!env.ADVISOR_API_ENABLED) {
    return res.json({
      _status: "not_configured",
      _note: "Advisor API is not configured.",
      data: null,
    });
  }

  const { campaignId } = req.params;
  const { date_range, date_start, date_stop } = req.query;

  const result = await advisorClient.getCampaignInsights(campaignId, {
    dateRange: date_range,
    dateStart: date_start,
    dateStop: date_stop,
  });

  res.json({
    _status: "live",
    data: result,
  });
}

/**
 * List ad sets for a campaign from Advisor API.
 * GET /api/advisor/campaigns/:campaignId/adsets
 */
async function listAdvisorAdSets(req, res) {
  // Graceful fallback when not configured
  if (!env.ADVISOR_API_ENABLED) {
    return res.json({
      _status: "not_configured",
      _note: "Advisor API is not configured.",
      data: [],
    });
  }

  const { campaignId } = req.params;

  const result = await advisorClient.listAdSets(campaignId);

  res.json({
    _status: "live",
    ...result,
  });
}

/**
 * Get ad set details from Advisor API.
 * GET /api/advisor/campaigns/:campaignId/adsets/:adsetId
 */
async function getAdvisorAdSetDetails(req, res) {
  if (!env.ADVISOR_API_ENABLED) {
    return res.json({
      _status: "not_configured",
      _note: "Advisor API is not configured.",
      data: null,
    });
  }

  const { campaignId, adsetId } = req.params;

  const result = await advisorClient.getAdSetDetails(campaignId, adsetId);

  res.json({
    _status: "live",
    data: result,
  });
}

/**
 * List ads for an ad set from Advisor API.
 * GET /api/advisor/campaigns/:campaignId/adsets/:adsetId/ads
 */
async function listAdvisorAds(req, res) {
  if (!env.ADVISOR_API_ENABLED) {
    return res.json({
      _status: "not_configured",
      _note: "Advisor API is not configured.",
      data: [],
    });
  }

  const { campaignId, adsetId } = req.params;

  const result = await advisorClient.listAds(campaignId, adsetId);

  res.json({
    _status: "live",
    ...result,
  });
}

/**
 * Get ad details from Advisor API.
 * GET /api/advisor/campaigns/:campaignId/adsets/:adsetId/ads/:adId
 */
async function getAdvisorAdDetails(req, res) {
  if (!env.ADVISOR_API_ENABLED) {
    return res.json({
      _status: "not_configured",
      _note: "Advisor API is not configured.",
      data: null,
    });
  }

  const { campaignId, adsetId, adId } = req.params;

  const result = await advisorClient.getAdDetails(campaignId, adsetId, adId);

  res.json({
    _status: "live",
    data: result,
  });
}

module.exports = {
  listAdvisorCampaigns,
  getAdvisorCampaignDetails,
  getAdvisorCampaignInsights,
  listAdvisorAdSets,
  getAdvisorAdSetDetails,
  listAdvisorAds,
  getAdvisorAdDetails,
};
