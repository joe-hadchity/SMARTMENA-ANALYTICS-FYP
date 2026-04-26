const metaAdsService = require("../services/platformIntegrations/metaAdsService");

// ---------------------------------------------------------------------------
// Ad Accounts
// ---------------------------------------------------------------------------

async function getAdAccounts(req, res) {
  const result = await metaAdsService.fetchAdAccounts(req.workspaceId);
  res.json(result);
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

async function listMetaCampaigns(req, res) {
  const { adAccountId, effectiveStatus } = req.query;
  const statusFilter = effectiveStatus
    ? String(effectiveStatus).split(",").map((s) => s.trim().toUpperCase())
    : undefined;

  const result = await metaAdsService.listCampaigns({
    workspaceId: req.workspaceId,
    adAccountId,
    effectiveStatus: statusFilter,
  });
  res.json(result);
}

async function getMetaCampaign(req, res) {
  const result = await metaAdsService.getCampaign({
    workspaceId: req.workspaceId,
    campaignId: req.params.id,
  });
  if (result._status !== "not_implemented" && result.data === null) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
}

async function createMetaCampaign(req, res) {
  const result = await metaAdsService.createCampaign({
    workspaceId: req.workspaceId,
    adAccountId: req.body.adAccountId,
    payload: req.body,
  });
  res.status(201).json(result);
}

async function updateMetaCampaign(req, res) {
  const result = await metaAdsService.updateCampaign({
    workspaceId: req.workspaceId,
    campaignId: req.params.id,
    patch: req.body,
  });
  res.json(result);
}

async function deleteMetaCampaign(req, res) {
  const result = await metaAdsService.deleteCampaign({
    workspaceId: req.workspaceId,
    campaignId: req.params.id,
  });
  res.json(result);
}

// ---------------------------------------------------------------------------
// Ad Sets
// ---------------------------------------------------------------------------

async function listAdsets(req, res) {
  const result = await metaAdsService.listAdsets({
    workspaceId: req.workspaceId,
    adAccountId: req.query.adAccountId,
    campaignId: req.params.campaignId,
  });
  res.json(result);
}

async function getAdset(req, res) {
  const result = await metaAdsService.getAdset({
    workspaceId: req.workspaceId,
    adsetId: req.params.adsetId,
  });
  res.json(result);
}

async function createAdset(req, res) {
  const result = await metaAdsService.createAdset({
    workspaceId: req.workspaceId,
    adAccountId: req.body.adAccountId,
    payload: { ...req.body, campaignId: req.params.campaignId || req.body.campaignId },
  });
  res.status(201).json(result);
}

async function updateAdset(req, res) {
  const result = await metaAdsService.updateAdset({
    workspaceId: req.workspaceId,
    adsetId: req.params.adsetId,
    patch: req.body,
  });
  res.json(result);
}

async function deleteAdset(req, res) {
  const result = await metaAdsService.deleteAdset({
    workspaceId: req.workspaceId,
    adsetId: req.params.adsetId,
  });
  res.json(result);
}

// ---------------------------------------------------------------------------
// Ad Creatives
// ---------------------------------------------------------------------------

async function listCreatives(req, res) {
  const result = await metaAdsService.listCreatives({
    workspaceId: req.workspaceId,
    adAccountId: req.query.adAccountId,
  });
  res.json(result);
}

async function getCreative(req, res) {
  const result = await metaAdsService.getCreative({
    workspaceId: req.workspaceId,
    creativeId: req.params.creativeId,
  });
  res.json(result);
}

async function createCreative(req, res) {
  const result = await metaAdsService.createCreative({
    workspaceId: req.workspaceId,
    adAccountId: req.body.adAccountId,
    payload: req.body,
  });
  res.status(201).json(result);
}

async function deleteCreative(req, res) {
  const result = await metaAdsService.deleteCreative({
    workspaceId: req.workspaceId,
    creativeId: req.params.creativeId,
  });
  res.json(result);
}

module.exports = {
  getAdAccounts,
  listMetaCampaigns,
  getMetaCampaign,
  createMetaCampaign,
  updateMetaCampaign,
  deleteMetaCampaign,
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
