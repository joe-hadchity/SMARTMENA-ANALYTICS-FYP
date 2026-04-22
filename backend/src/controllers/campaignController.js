const campaignService = require("../services/campaignService");

async function createCampaign(req, res) {
  // Stamp with the active workspace so new rows are always scoped.
  const payload = { ...req.body };
  if (req.workspaceId && !payload.workspace_id) {
    payload.workspace_id = req.workspaceId;
  }
  const campaign = await campaignService.createCampaign(payload);
  res.status(201).json(campaign);
}

async function listCampaigns(req, res) {
  const limit = Number(req.query.limit) || 100;
  const rows = await campaignService.listCampaigns({
    workspaceId: req.workspaceId,
    limit,
  });
  res.json(rows);
}

async function getCampaign(req, res) {
  const row = await campaignService.getCampaignWithRelations(req.params.id);
  res.json(row);
}

module.exports = { createCampaign, listCampaigns, getCampaign };
