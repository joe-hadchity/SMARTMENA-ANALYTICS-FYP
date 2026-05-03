const trendIntelligenceService = require("../services/trendIntelligence/trendIntelligenceService");

async function getTrendIntelligence(req, res) {
  const workspaceId = req.params.workspaceId || req.params.id;
  const dashboard = await trendIntelligenceService.buildDashboard({
    workspaceId,
    brandId: req.query.brand_id || null,
    scope: req.query.scope || "all",
    limit: req.query.limit ? Number(req.query.limit) : 80,
  });
  res.json(dashboard);
}

module.exports = {
  getTrendIntelligence,
};
