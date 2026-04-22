const reportService = require("../services/reportService");

function resolveWorkspaceId(req) {
  return (
    req.params.id ||
    req.workspace?.id ||
    req.body?.workspaceId ||
    req.get?.("x-workspace-id") ||
    null
  );
}

function requireWorkspace(req, res) {
  const id = resolveWorkspaceId(req);
  if (!id) {
    res.status(400).json({
      error: {
        code: "WORKSPACE_REQUIRED",
        message:
          "workspaceId is required (path :id, x-workspace-id header, or body).",
      },
    });
    return null;
  }
  return id;
}

async function getGrowthReport(req, res) {
  const workspaceId = requireWorkspace(req, res);
  if (!workspaceId) return;
  const locale = req.query.locale === "ar" ? "ar" : "en";
  const report = await reportService.generateGrowthReport(workspaceId, { locale });
  res.json(report);
}

async function createShare(req, res) {
  const workspaceId = requireWorkspace(req, res);
  if (!workspaceId) return;
  const locale = req.body?.locale === "ar" ? "ar" : "en";
  const expiresInDays = Number.isFinite(Number(req.body?.expiresInDays))
    ? Number(req.body.expiresInDays)
    : undefined;
  const share = await reportService.shareReport(workspaceId, {
    locale,
    expiresInDays,
  });
  res.status(201).json(share);
}

async function listShares(req, res) {
  const workspaceId = requireWorkspace(req, res);
  if (!workspaceId) return;
  const rows = await reportService.listShares(workspaceId);
  res.json(rows);
}

async function revokeShare(req, res) {
  const workspaceId = requireWorkspace(req, res);
  if (!workspaceId) return;
  const result = await reportService.revokeShare(workspaceId, req.params.shareId);
  res.json(result);
}

async function getSharedReport(req, res) {
  const result = await reportService.getSharedReport(req.params.token);
  res.json(result);
}

module.exports = {
  getGrowthReport,
  createShare,
  listShares,
  revokeShare,
  getSharedReport,
};
