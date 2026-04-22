const dashboardService = require("../services/dashboardService");

async function getWorkspaceDashboardSummary(req, res) {
  const summary = await dashboardService.getWorkspaceSummary(req.params.id);
  res.json(summary);
}

module.exports = {
  getWorkspaceDashboardSummary,
};
