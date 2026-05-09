const socialPostService = require("../services/socialPostService");
const postMetricsSnapshotService = require("../services/postMetricsSnapshotService");
const { syncOwnInstagram } = require("../services/metaInstagramSyncService");

async function listAllSocialPosts(req, res) {
  const rows = await socialPostService.listAllSocialPostsForWorkspace({
    workspaceId: req.workspaceId,
    socialAccountId: req.query.socialAccountId || undefined,
    mediaType: req.query.mediaType || undefined,
    limit: req.query.limit ? Number(req.query.limit) : 60,
  });
  res.json(rows);
}

async function refreshOwnPosts(req, res) {
  const requested = Number(req.body?.limit) || 50;
  const limit = Math.min(requested, 1000);

  // Own posts must come from the official Instagram Graph API.
  // Apify remains available for competitor public benchmarking only.
  const result = await syncOwnInstagram(req.workspaceId, { limit });
  res.json({ ...result, source: "meta_graph" });
}

async function listPostsForAccount(req, res) {
  const rows = await socialPostService.listPostsForAccount(req.params.id, {
    mediaType: req.query.mediaType,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json(rows);
}

async function getSocialPost(req, res) {
  const row = await socialPostService.getSocialPostById(req.params.id);
  res.json(row);
}

async function getPostMetricsHistory(req, res) {
  const rows = await postMetricsSnapshotService.listSnapshotsForPost(
    req.params.id,
    {
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      ascending: (req.query.order || "asc") !== "desc",
    },
  );
  res.json(rows);
}

module.exports = {
  listAllSocialPosts,
  refreshOwnPosts,
  listPostsForAccount,
  getSocialPost,
  getPostMetricsHistory,
};
