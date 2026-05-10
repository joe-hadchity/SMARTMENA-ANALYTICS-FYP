const inboxService = require("../services/inboxService");

async function list(req, res) {
  const rows = await inboxService.listInbox(req.workspaceId, req.query);
  res.json(rows);
}

async function summary(req, res) {
  const data = await inboxService.getSummary(req.workspaceId);
  res.json(data);
}

async function sync(req, res) {
  const data = await inboxService.syncInbox(req.workspaceId, req.body || {});
  res.json(data);
}

async function markStatus(req, res) {
  const data = await inboxService.updateStatus(req.workspaceId, req.params.id, req.body?.status);
  res.json(data);
}

async function reply(req, res) {
  const data = await inboxService.reply(req.workspaceId, req.params.id, req.body?.message);
  res.status(201).json(data);
}

module.exports = {
  list,
  summary,
  sync,
  markStatus,
  reply,
};
