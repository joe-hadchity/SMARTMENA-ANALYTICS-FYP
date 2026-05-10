const audienceInsightsService = require("../services/audienceInsightsService");

async function getAudienceInsights(req, res) {
  const data = await audienceInsightsService.getAudienceInsights(req.workspaceId, {
    days: req.query.days ? Number(req.query.days) : 90,
  });
  res.json(data);
}

async function refreshAudienceInsights(req, res) {
  const data = await audienceInsightsService.refreshAudienceInsights(req.workspaceId, {
    limit: req.body?.limit ? Number(req.body.limit) : 50,
  });
  res.json(data);
}

module.exports = {
  getAudienceInsights,
  refreshAudienceInsights,
};
