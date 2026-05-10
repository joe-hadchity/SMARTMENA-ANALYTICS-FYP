const hashtagTrendService = require("../services/hashtags/hashtagTrendService");

async function listTrackedHashtags(req, res) {
  const data = await hashtagTrendService.listTrackedHashtags(req.workspaceId);
  res.json(data);
}

async function searchHashtags(req, res) {
  const data = await hashtagTrendService.searchHashtags(req.query.q || req.query.query || "");
  res.json(data);
}

async function createTrackedHashtag(req, res) {
  const data = await hashtagTrendService.createTrackedHashtag(req.workspaceId, req.body || {});
  res.status(201).json(data);
}

async function deleteTrackedHashtag(req, res) {
  const data = await hashtagTrendService.deleteTrackedHashtag(req.workspaceId, req.params.id);
  res.json(data);
}

async function refreshTrackedHashtag(req, res) {
  const data = await hashtagTrendService.refreshHashtag(req.workspaceId, req.params.id, {
    limit: req.body?.limit ? Number(req.body.limit) : undefined,
  });
  res.json(data);
}

async function getTrackedHashtagSnapshots(req, res) {
  const data = await hashtagTrendService.getHashtagSnapshots(req.workspaceId, req.params.id, {
    limit: req.query.limit ? Number(req.query.limit) : 12,
  });
  res.json(data);
}

module.exports = {
  listTrackedHashtags,
  searchHashtags,
  createTrackedHashtag,
  deleteTrackedHashtag,
  refreshTrackedHashtag,
  getTrackedHashtagSnapshots,
};
