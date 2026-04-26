/**
 * metaAdsService -- Meta Ads Manager Graph API adapter.
 *
 * Mock-first: when no active OAuth token is found for the workspace's Meta
 * connection, every function returns { _status: "not_implemented", data: [] }
 * so the rest of the product keeps working without branching at call sites.
 *
 * When a live token is available, real Graph API calls are made to
 * graph.facebook.com/{META_GRAPH_VERSION}. On Graph error the function returns
 * { _status: "live_error", _errorMessage: "...", data: [] }.
 *
 * Required Graph permission: ads_management
 */

const axios = require("axios");
const env = require("../../config/env");
const logger = require("../../utils/logger");
const oauthConnectionService = require("../oauth/oauthConnectionService");

const GRAPH_BASE = () => `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;

const CAMPAIGN_FIELDS =
  "id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,start_time,end_time,created_time,updated_time";

const ADSET_FIELDS =
  "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,bid_amount,optimization_goal,billing_event,targeting,start_time,end_time,created_time,updated_time";

const CREATIVE_FIELDS =
  "id,name,object_story_spec,body,title,call_to_action_type,created_time,updated_time";

// ---------------------------------------------------------------------------
// Token resolution
// ---------------------------------------------------------------------------

async function resolveAdsToken(workspaceId) {
  if (!env.META_OAUTH_ENABLED) return null;
  if (!workspaceId) return null;
  try {
    const conn = await oauthConnectionService.getConnectionByProvider({
      workspaceId,
      provider: "meta",
    });
    if (!conn || conn.status !== "active") return null;
    return oauthConnectionService.extractPlaintext(conn)?.accessToken || null;
  } catch (err) {
    logger.warn?.("[metaAdsService] failed to resolve token:", err.message);
    return null;
  }
}

function notImplemented(extra = {}) {
  return {
    _status: "not_implemented",
    _note: "No active Meta OAuth token for this workspace. Connect Meta via /api/oauth/meta/init.",
    data: [],
    ...extra,
  };
}

function liveError(message, extra = {}) {
  return {
    _status: "live_error",
    _errorMessage: message,
    data: [],
    ...extra,
  };
}

function graphError(err) {
  return err.response?.data?.error?.message || err.message || "Graph API error";
}

// ---------------------------------------------------------------------------
// Ad Accounts
// ---------------------------------------------------------------------------

/**
 * List all ad accounts the authenticated user can manage.
 * @param {string} workspaceId
 */
async function fetchAdAccounts(workspaceId) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented();

  try {
    const res = await axios.get(`${GRAPH_BASE()}/me/adaccounts`, {
      params: {
        fields: "id,name,currency,account_status,timezone_name",
        access_token: accessToken,
      },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data?.data || [] };
  } catch (err) {
    logger.warn?.("[metaAdsService.fetchAdAccounts]", graphError(err));
    return liveError(graphError(err));
  }
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

/**
 * List campaigns for an ad account.
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.adAccountId  e.g. "act_123456"
 * @param {string[]} [opts.effectiveStatus]  e.g. ["ACTIVE","PAUSED"]
 */
async function listCampaigns({ workspaceId, adAccountId, effectiveStatus } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented();

  const params = {
    fields: CAMPAIGN_FIELDS,
    access_token: accessToken,
  };
  if (effectiveStatus?.length) {
    params.effective_status = JSON.stringify(effectiveStatus);
  }

  try {
    const id = normalizeAdAccountId(adAccountId);
    const res = await axios.get(`${GRAPH_BASE()}/${id}/campaigns`, {
      params,
      timeout: 15_000,
    });
    return { _status: "live", data: res.data?.data || [], paging: res.data?.paging };
  } catch (err) {
    logger.warn?.("[metaAdsService.listCampaigns]", graphError(err));
    return liveError(graphError(err));
  }
}

/**
 * Get a single campaign by ID.
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.campaignId
 */
async function getCampaign({ workspaceId, campaignId } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  try {
    const res = await axios.get(`${GRAPH_BASE()}/${campaignId}`, {
      params: { fields: CAMPAIGN_FIELDS, access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.getCampaign]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

/**
 * Create a campaign under an ad account.
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.adAccountId
 * @param {object} opts.payload  { name, objective, status, buyingType, dailyBudget?, lifetimeBudget?, startTime?, endTime?, specialAdCategories? }
 */
async function createCampaign({ workspaceId, adAccountId, payload } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  const body = {
    name: payload.name,
    objective: payload.objective,
    status: payload.status || "PAUSED",
    buying_type: payload.buyingType || "AUCTION",
    special_ad_categories: payload.specialAdCategories || [],
  };
  if (payload.dailyBudget) body.daily_budget = String(payload.dailyBudget);
  if (payload.lifetimeBudget) body.lifetime_budget = String(payload.lifetimeBudget);
  if (payload.startTime) body.start_time = payload.startTime;
  if (payload.endTime) body.end_time = payload.endTime;

  try {
    const id = normalizeAdAccountId(adAccountId);
    const res = await axios.post(`${GRAPH_BASE()}/${id}/campaigns`, body, {
      params: { access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.createCampaign]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

/**
 * Update a campaign.
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.campaignId
 * @param {object} opts.patch  Subset of { name, status, dailyBudget, lifetimeBudget, startTime, endTime }
 */
async function updateCampaign({ workspaceId, campaignId, patch } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  const body = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.dailyBudget !== undefined) body.daily_budget = String(patch.dailyBudget);
  if (patch.lifetimeBudget !== undefined) body.lifetime_budget = String(patch.lifetimeBudget);
  if (patch.startTime !== undefined) body.start_time = patch.startTime;
  if (patch.endTime !== undefined) body.end_time = patch.endTime;

  try {
    const res = await axios.post(`${GRAPH_BASE()}/${campaignId}`, body, {
      params: { access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.updateCampaign]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

/**
 * Delete (archive) a campaign.
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.campaignId
 */
async function deleteCampaign({ workspaceId, campaignId } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  try {
    const res = await axios.delete(`${GRAPH_BASE()}/${campaignId}`, {
      params: { access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.deleteCampaign]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

// ---------------------------------------------------------------------------
// Ad Sets
// ---------------------------------------------------------------------------

/**
 * List ad sets. Pass campaignId to scope to one campaign, or adAccountId for all.
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {string} [opts.adAccountId]
 * @param {string} [opts.campaignId]
 */
async function listAdsets({ workspaceId, adAccountId, campaignId } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented();

  const parentId = campaignId || normalizeAdAccountId(adAccountId);
  if (!parentId) {
    const err = new Error("adAccountId or campaignId is required");
    err.status = 400;
    throw err;
  }

  try {
    const res = await axios.get(`${GRAPH_BASE()}/${parentId}/adsets`, {
      params: { fields: ADSET_FIELDS, access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data?.data || [], paging: res.data?.paging };
  } catch (err) {
    logger.warn?.("[metaAdsService.listAdsets]", graphError(err));
    return liveError(graphError(err));
  }
}

/**
 * Get a single ad set.
 */
async function getAdset({ workspaceId, adsetId } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  try {
    const res = await axios.get(`${GRAPH_BASE()}/${adsetId}`, {
      params: { fields: ADSET_FIELDS, access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.getAdset]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

/**
 * Create an ad set under an ad account.
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.adAccountId
 * @param {object} opts.payload  { name, campaignId, dailyBudget, optimizationGoal, billingEvent, targeting, startTime?, endTime?, bidAmount? }
 */
async function createAdset({ workspaceId, adAccountId, payload } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  const body = {
    name: payload.name,
    campaign_id: payload.campaignId,
    optimization_goal: payload.optimizationGoal,
    billing_event: payload.billingEvent,
    targeting: JSON.stringify(payload.targeting),
    status: payload.status || "PAUSED",
  };
  if (payload.dailyBudget) body.daily_budget = String(payload.dailyBudget);
  if (payload.lifetimeBudget) body.lifetime_budget = String(payload.lifetimeBudget);
  if (payload.bidAmount) body.bid_amount = String(payload.bidAmount);
  if (payload.startTime) body.start_time = payload.startTime;
  if (payload.endTime) body.end_time = payload.endTime;

  try {
    const id = normalizeAdAccountId(adAccountId);
    const res = await axios.post(`${GRAPH_BASE()}/${id}/adsets`, body, {
      params: { access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.createAdset]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

/**
 * Update an ad set.
 */
async function updateAdset({ workspaceId, adsetId, patch } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  const body = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.dailyBudget !== undefined) body.daily_budget = String(patch.dailyBudget);
  if (patch.bidAmount !== undefined) body.bid_amount = String(patch.bidAmount);
  if (patch.targeting !== undefined) body.targeting = JSON.stringify(patch.targeting);
  if (patch.startTime !== undefined) body.start_time = patch.startTime;
  if (patch.endTime !== undefined) body.end_time = patch.endTime;

  try {
    const res = await axios.post(`${GRAPH_BASE()}/${adsetId}`, body, {
      params: { access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.updateAdset]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

/**
 * Delete an ad set.
 */
async function deleteAdset({ workspaceId, adsetId } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  try {
    const res = await axios.delete(`${GRAPH_BASE()}/${adsetId}`, {
      params: { access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.deleteAdset]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

// ---------------------------------------------------------------------------
// Ad Creatives
// ---------------------------------------------------------------------------

/**
 * List ad creatives for an ad account.
 */
async function listCreatives({ workspaceId, adAccountId } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented();

  try {
    const id = normalizeAdAccountId(adAccountId);
    const res = await axios.get(`${GRAPH_BASE()}/${id}/adcreatives`, {
      params: { fields: CREATIVE_FIELDS, access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data?.data || [], paging: res.data?.paging };
  } catch (err) {
    logger.warn?.("[metaAdsService.listCreatives]", graphError(err));
    return liveError(graphError(err));
  }
}

/**
 * Get a single ad creative.
 */
async function getCreative({ workspaceId, creativeId } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  try {
    const res = await axios.get(`${GRAPH_BASE()}/${creativeId}`, {
      params: { fields: CREATIVE_FIELDS, access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.getCreative]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

/**
 * Create an ad creative.
 * @param {object} opts
 * @param {string} opts.workspaceId
 * @param {string} opts.adAccountId
 * @param {object} opts.payload
 *   { name, objectStorySpec: { pageId, linkData: { link, message, name, description, imageHash, callToAction } } }
 */
async function createCreative({ workspaceId, adAccountId, payload } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  const { name, objectStorySpec } = payload;
  const body = {
    name,
    object_story_spec: {
      page_id: objectStorySpec.pageId,
      link_data: {
        link: objectStorySpec.linkData.link,
        message: objectStorySpec.linkData.message,
        name: objectStorySpec.linkData.name,
        description: objectStorySpec.linkData.description,
        ...(objectStorySpec.linkData.imageHash
          ? { image_hash: objectStorySpec.linkData.imageHash }
          : {}),
        ...(objectStorySpec.linkData.callToAction
          ? {
              call_to_action: {
                type: objectStorySpec.linkData.callToAction.type,
                value: { link: objectStorySpec.linkData.callToAction.link },
              },
            }
          : {}),
      },
    },
  };

  try {
    const id = normalizeAdAccountId(adAccountId);
    const res = await axios.post(`${GRAPH_BASE()}/${id}/adcreatives`, body, {
      params: { access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.createCreative]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

/**
 * Delete an ad creative.
 */
async function deleteCreative({ workspaceId, creativeId } = {}) {
  const accessToken = await resolveAdsToken(workspaceId);
  if (!accessToken) return notImplemented({ data: null });

  try {
    const res = await axios.delete(`${GRAPH_BASE()}/${creativeId}`, {
      params: { access_token: accessToken },
      timeout: 15_000,
    });
    return { _status: "live", data: res.data };
  } catch (err) {
    logger.warn?.("[metaAdsService.deleteCreative]", graphError(err));
    return liveError(graphError(err), { data: null });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ensure ad account IDs are prefixed with "act_".
 * Accepts "123456" or "act_123456".
 */
function normalizeAdAccountId(id) {
  if (!id) return null;
  const s = String(id);
  return s.startsWith("act_") ? s : `act_${s}`;
}

module.exports = {
  fetchAdAccounts,
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  listAdsets,
  getAdset,
  createAdset,
  updateAdset,
  deleteAdset,
  listCreatives,
  getCreative,
  createCreative,
  deleteCreative,
};
