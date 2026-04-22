const syncedPostService = require("../services/syncedPostService");

async function listSyncedPosts(req, res) {
  const rows = await syncedPostService.listSyncedPosts({
    workspaceId: req.workspaceId,
    socialAccountId: req.query.socialAccountId,
    lang: req.query.lang,
    postType: req.query.postType,
    limit: req.query.limit,
  });
  res.json(rows);
}

async function getSyncedPost(req, res) {
  const row = await syncedPostService.getSyncedPostById(req.params.id);
  res.json(row);
}

async function listSyncedPostMetrics(req, res) {
  const rows = await syncedPostService.listPostMetrics({
    syncedPostId: req.params.id,
    from: req.query.from,
    to: req.query.to,
    limit: req.query.limit,
  });
  res.json(rows);
}

module.exports = {
  listSyncedPosts,
  getSyncedPost,
  listSyncedPostMetrics,
};
