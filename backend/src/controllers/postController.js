const postService = require("../services/postService");

async function createPost(req, res) {
  const payload = { ...req.body };
  if (req.workspaceId && !payload.workspace_id) {
    payload.workspace_id = req.workspaceId;
  }
  const post = await postService.createPost(payload);
  res.status(201).json(post);
}

module.exports = { createPost };
