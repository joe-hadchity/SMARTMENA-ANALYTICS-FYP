const analyticsService = require("../services/analyticsService");

async function getOverview(req, res) {
  const data = await analyticsService.getOverview(req.workspaceId);
  res.json(data);
}

async function getTimeseries(req, res) {
  const data = await analyticsService.getTimeseries(req.workspaceId, {
    metric: req.query.metric || "engagement",
    groupBy: req.query.groupBy || "day",
  });
  res.json(data);
}

async function getPlatformBreakdown(req, res) {
  const data = await analyticsService.getPlatformBreakdown(req.workspaceId);
  res.json(data);
}

async function getSentimentBreakdown(req, res) {
  const data = await analyticsService.getSentimentBreakdown(req.workspaceId);
  res.json(data);
}

async function getTopPosts(req, res) {
  const data = await analyticsService.getTopPosts(req.workspaceId, {
    limit: req.query.limit || 10,
    sortBy: req.query.sortBy || "engagement",
  });
  res.json(data);
}

module.exports = {
  getOverview,
  getTimeseries,
  getPlatformBreakdown,
  getSentimentBreakdown,
  getTopPosts,
};
