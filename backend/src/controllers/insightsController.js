const insightsService = require("../services/insightsService");

async function listInsights(req, res) {
  const rows = await insightsService.listInsights({
    workspaceId: req.workspaceId,
    scopeType: req.query.scopeType,
    insightType: req.query.insightType,
    severity: req.query.severity,
    limit: req.query.limit,
  });
  res.json(rows);
}

async function generateInsights(req, res) {
  const rows = await insightsService.generateForWorkspace(req.workspaceId);
  res.status(201).json(rows);
}

module.exports = { listInsights, generateInsights };
