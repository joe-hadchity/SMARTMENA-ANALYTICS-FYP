const socialAccountService = require("../services/socialAccountService");
const syncService = require("../services/syncService");

async function listSocialAccounts(req, res) {
  const rows = await socialAccountService.listSocialAccounts({
    workspaceId: req.workspaceId,
  });
  res.json(rows);
}

async function getSocialAccount(req, res) {
  const row = await socialAccountService.getSocialAccountById(req.params.id);
  res.json(row);
}

async function deleteSocialAccount(req, res) {
  const result = await socialAccountService.deleteSocialAccount(req.params.id);
  res.status(200).json(result);
}

async function connectMeta(req, res) {
  const row = await socialAccountService.connectMetaAccount({
    workspaceId: req.workspaceId,
    ...req.body,
  });
  res.status(201).json(row);
}

async function syncSocialAccount(req, res) {
  const summary = await syncService.syncAccount(req.params.id, req.body || {});
  res.status(200).json(summary);
}

async function createSocialAccount(req, res) {
  const row = await socialAccountService.createSocialAccount({
    ...req.body,
    // Body-provided workspace_id wins so admins can create rows for any
    // workspace; when absent, fall back to the request context.
    workspaceId: req.body.workspace_id || req.workspaceId,
  });
  res.status(201).json(row);
}

module.exports = {
  listSocialAccounts,
  getSocialAccount,
  deleteSocialAccount,
  connectMeta,
  createSocialAccount,
  syncSocialAccount,
};
