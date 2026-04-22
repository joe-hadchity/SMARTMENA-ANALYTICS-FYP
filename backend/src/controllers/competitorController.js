/**
 * competitorController -- HTTP layer for competitor tracking + weekly digest.
 *
 * Every route expects `workspaceContext` middleware upstream; the workspace
 * is resolved from `req.workspaceId`.
 */

const competitorService = require("../services/competitorService");
const competitorScraperService = require("../services/competitorScraperService");
const competitorDigestService = require("../services/competitorDigestService");

// ---------------------------------------------------------------------------
// competitor_accounts
// ---------------------------------------------------------------------------

async function list(req, res) {
  const platform = req.query.platform ? String(req.query.platform) : undefined;
  const includeInactive = String(req.query.include_inactive) === "true";
  const competitors = await competitorService.listCompetitors(req.workspaceId, {
    platform,
    includeInactive,
  });
  res.status(200).json(competitors);
}

async function getOne(req, res) {
  const competitor = await competitorService.getCompetitorById(req.params.id);
  res.status(200).json(competitor);
}

async function create(req, res) {
  const competitor = await competitorService.createCompetitor(
    req.workspaceId,
    req.body,
  );
  res.status(201).json(competitor);
}

async function update(req, res) {
  const competitor = await competitorService.updateCompetitor(
    req.params.id,
    req.body,
  );
  res.status(200).json(competitor);
}

async function remove(req, res) {
  const result = await competitorService.deleteCompetitor(req.params.id);
  res.status(200).json(result);
}

// ---------------------------------------------------------------------------
// posts + snapshots
// ---------------------------------------------------------------------------

async function listPosts(req, res) {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const posts = await competitorService.listPostsForCompetitor(req.params.id, {
    limit,
  });
  res.status(200).json(posts);
}

async function refreshOne(req, res) {
  const competitor = await competitorService.getCompetitorById(req.params.id);
  const result = await competitorScraperService.refreshCompetitor(competitor, {
    limit: Math.min(Number(req.query.limit) || 12, 50),
  });
  res.status(200).json({ competitor_id: competitor.id, ...result });
}

async function refreshAll(req, res) {
  const results = await competitorScraperService.refreshAll(req.workspaceId);
  res.status(200).json({ refreshed: results.length, results });
}

// ---------------------------------------------------------------------------
// digest
// ---------------------------------------------------------------------------

async function latestDigest(req, res) {
  const run = await competitorDigestService.latestRun(req.workspaceId);
  if (!run) return res.status(404).json({ message: "No digest runs yet." });
  res.status(200).json(run);
}

async function listDigestRuns(req, res) {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const runs = await competitorDigestService.listRuns(req.workspaceId, { limit });
  res.status(200).json(runs);
}

async function generateDigest(req, res) {
  const {
    window_days,
    locale,
    delivery_target,
    skip_refresh,
  } = req.body || {};
  const result = await competitorDigestService.runDigest({
    workspaceId: req.workspaceId,
    windowDays: window_days,
    locale,
    deliveryTarget: delivery_target || null,
    skipRefresh: Boolean(skip_refresh),
  });
  res.status(201).json(result);
}

async function previewAggregate(req, res) {
  const windowDays = Math.min(Number(req.query.window_days) || 7, 30);
  const aggregate = await competitorDigestService.aggregateWorkspace(
    req.workspaceId,
    { windowDays },
  );
  res.status(200).json(aggregate);
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  listPosts,
  refreshOne,
  refreshAll,
  latestDigest,
  listDigestRuns,
  generateDigest,
  previewAggregate,
};
