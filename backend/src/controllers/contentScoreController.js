const contentScoreService = require("../services/contentScoreService");
const captionStudioService = require("../services/captionStudioService");

async function scoreContent(req, res) {
  // Workspace resolution: use the explicit workspace_id in the body if
  // provided, otherwise fall back to the one attached by the
  // workspaceContext middleware (x-workspace-id header -> demo fallback).
  const workspaceId = req.body.workspace_id || req.workspaceId;
  if (!workspaceId) {
    const err = new Error(
      "workspace_id is required (send it in body or x-workspace-id header)",
    );
    err.status = 400;
    throw err;
  }

  const result = await contentScoreService.scoreContent({
    ...req.body,
    workspaceId,
  });
  res.status(201).json(result);
}

async function composeContent(req, res) {
  const workspaceId = req.body.workspace_id || req.workspaceId;
  if (!workspaceId) {
    const err = new Error(
      "workspace_id is required (send it in body or x-workspace-id header)",
    );
    err.status = 400;
    throw err;
  }

  const result = await captionStudioService.composeVariants({
    ...req.body,
    workspaceId,
  });
  res.status(200).json(result);
}

module.exports = { scoreContent, composeContent };
