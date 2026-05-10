/**
 * Resolves the active workspace for SmartMENA.
 *
 * Resolution order:
 *   1. Require a valid bearer token
 *   2. Use authenticated user's requested `x-workspace-id` header
 *   3. Otherwise use authenticated user's first workspace membership
 *
 * Attaches:
 *   req.authUser
 *   req.workspace
 *   req.workspaceId
 *   req.workspaceRole
 */

const authService = require("../services/authService");
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function workspaceContext() {
  return async function workspaceContextMiddleware(req, res, next) {
    try {
      const headerId = req.get("x-workspace-id");
      const token = authService.extractBearerToken(req);
      let authUser = null;
      let appUser = null;
      let workspace = null;
      let role = null;

      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }

      authUser = await authService.getUserFromAccessToken(token);
      appUser = await authService.ensurePublicUser(authUser);

      if (headerId) {
        if (!UUID_RE.test(headerId)) {
          const err = new Error("x-workspace-id must be a valid UUID");
          err.status = 400;
          throw err;
        }
        const workspaceService = require("../services/workspaceService");
        workspace = await workspaceService.getWorkspaceById(headerId);
        if (!workspace) {
          return res.status(404).json({ message: "Workspace not found" });
        }
        const membership = await authService.membershipForWorkspace(
          appUser.id,
          workspace.id,
        );
        if (!membership) {
          return res.status(403).json({
            message: "You do not have access to this workspace",
          });
        }
        role = membership.role;
      } else {
        const membership = await authService.defaultMembership(appUser.id);
        if (membership) {
          workspace = membership.workspace;
          role = membership.role;
        } else {
          return res.status(403).json({
            message: "This user is not assigned to a workspace",
          });
        }
      }

      req.authUser = authUser
        ? authService.publicUser({ ...authUser, id: appUser.id })
        : null;
      req.workspace = workspace || null;
      req.workspaceId = workspace ? workspace.id : null;
      req.workspaceRole = workspace ? role : null;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = workspaceContext;
