const socialPostService = require("../services/socialPostService");
const postMetricsSnapshotService = require("../services/postMetricsSnapshotService");

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
  listPostsForAccount,
  getSocialPost,
  getPostMetricsHistory,
};
