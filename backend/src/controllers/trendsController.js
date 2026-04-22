/**
 * trendsController -- HTTP layer for Trend Radar Layer 1 (discovery).
 *
 * All routes expect workspaceContext middleware upstream (req.workspaceId).
 */

const trendReadService = require("../services/trends/trendReadService");
const trendAggregator = require("../services/trends/trendAggregatorService");

async function listTrends(req, res) {
  const query = req.query || {};
  const result = await trendReadService.listTrends({
    workspaceId: req.workspaceId,
    kind: query.kind || "all",
    windowDays: query.window_days ?? 7,
    sortBy: query.sort_by || "volume",
    limit: query.limit ?? 50,
    platform: query.platform,
    source: query.source || "all",
    search: query.search,
  });
  res.status(200).json({
    workspace_id: req.workspaceId,
    kind: query.kind || "all",
    window_days: query.window_days ?? 7,
    sort_by: query.sort_by || "volume",
    count: result.length,
    trends: result,
  });
}

async function getDetail(req, res) {
  const query = req.query || {};
  const detail = await trendReadService.getTrendDetail({
    workspaceId: req.workspaceId,
    trendTermId: req.params.id,
    windowDays: query.window_days ?? 30,
  });
  res.status(200).json(detail);
}

async function rebuild(req, res) {
  const body = req.body || {};
  const summary = await trendAggregator.rebuildForWorkspace(req.workspaceId, {
    windowDays: body.window_days ?? 30,
    allowLLM: body.allow_llm ?? false,
  });
  res.status(200).json(summary);
}

module.exports = {
  listTrends,
  getDetail,
  rebuild,
};
