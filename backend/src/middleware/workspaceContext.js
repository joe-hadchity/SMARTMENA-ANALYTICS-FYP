/**
 * Resolves the active workspace for the current request.
 *
 *   1. If `x-workspace-id` header is present and is a UUID, looks it up.
 *   2. Otherwise falls back to the `demo` workspace (auto-created on first use).
 *
 * Attaches the resolved row to `req.workspace` and its id to `req.workspaceId`
 * so downstream handlers do not have to re-read the header.
 *
 * This is deliberately permissive for the beta (no auth). When auth lands,
 * this middleware becomes the natural place to switch to `auth.uid() ->
 * workspace_id` and reject unauthenticated requests.
 */

const workspaceService = require("../services/workspaceService");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function workspaceContext() {
  return async function workspaceContextMiddleware(req, res, next) {
    try {
      const headerId = req.get("x-workspace-id");
      let workspace;

      if (headerId) {
        if (!UUID_RE.test(headerId)) {
          const err = new Error("x-workspace-id must be a valid UUID");
          err.status = 400;
          throw err;
        }
        workspace = await workspaceService.getWorkspaceById(headerId);
      } else {
        workspace = await workspaceService.getOrCreateDemoWorkspace();
      }

      req.workspace = workspace;
      req.workspaceId = workspace.id;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = workspaceContext;
