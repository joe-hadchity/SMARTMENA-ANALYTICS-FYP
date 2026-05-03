const workspaceService = require("../services/workspaceService");
const insightsService = require("../services/insightsService");
const recommendationService = require("../services/recommendationService");
const demoBootstrapService = require("../services/demoBootstrapService");

async function listWorkspaces(req, res) {
  const rows = await workspaceService.listWorkspaces();
  res.json(rows);
}

async function getWorkspace(req, res) {
  const row = await workspaceService.getWorkspaceById(req.params.id);
  res.json(row);
}

async function createWorkspace(req, res) {
  const row = await workspaceService.createWorkspace(req.body);
  res.status(201).json(row);
}

async function getCurrentWorkspace(req, res) {
  res.json(req.workspace);
}

async function listSocialAccountsForWorkspace(req, res) {
  const rows = await workspaceService.listSocialAccountsForWorkspace(req.params.id);
  res.json(rows);
}

async function listSyncJobsForWorkspace(req, res) {
  const rows = await workspaceService.listSyncJobsForWorkspace(req.params.id, {
    platform: req.query.platform,
    status: req.query.status,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json(rows);
}

async function listInsightsForWorkspace(req, res) {
  // Existence check produces a clean 404 if the id is unknown.
  await workspaceService.getWorkspaceById(req.params.id);
  const rows = await insightsService.listInsightsForWorkspace(req.params.id, {
    insightType: req.query.insightType,
    severity: req.query.severity,
    source: req.query.source,
    limit: req.query.limit,
  });
  res.json(rows);
}

async function listRecommendationsForWorkspace(req, res) {
  const rows = await recommendationService.listRecommendationsForWorkspace(
    req.params.id,
    {
      recommendationType: req.query.recommendationType,
      priority: req.query.priority,
      limit: req.query.limit,
    },
  );
  res.json(rows);
}

async function getBusinessProfile(req, res) {
  const row = await workspaceService.getBusinessProfile(req.params.id);
  res.json(row);
}

async function updateBusinessProfile(req, res) {
  const row = await workspaceService.upsertBusinessProfile(req.params.id, req.body);
  res.json(row);
}

async function applyBorn2HikeProfile(req, res) {
  const row = await workspaceService.applyBorn2HikeProfile(req.params.id);
  res.json(row);
}

async function demoBootstrap(req, res) {
  // Accept either /:id/demo-bootstrap (path param) or /demo-bootstrap with
  // x-workspace-id header / body { workspaceId }. The route file binds both.
  const workspaceId =
    req.params.id ||
    req.workspace?.id ||
    req.body?.workspaceId ||
    null;

  if (!workspaceId) {
    const err = new Error(
      "workspaceId is required (via :id path, x-workspace-id header, or body)",
    );
    err.status = 400;
    throw err;
  }

  const summary = await demoBootstrapService.bootstrapDemoWorkspace(workspaceId);
  res.json(summary);
}

module.exports = {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  getCurrentWorkspace,
  listSocialAccountsForWorkspace,
  listSyncJobsForWorkspace,
  listInsightsForWorkspace,
  listRecommendationsForWorkspace,
  getBusinessProfile,
  updateBusinessProfile,
  applyBorn2HikeProfile,
  demoBootstrap,
};
