const scheduledPostService = require("../services/scheduledPostService");

function resolveWorkspaceId(req) {
  return (
    req.body?.workspace_id ||
    req.workspace?.id ||
    req.workspaceId ||
    req.get?.("x-workspace-id") ||
    req.params?.id ||
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

function parseStatusFilter(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return undefined;
}

async function list(req, res) {
  const workspaceId = requireWorkspace(req, res);
  if (!workspaceId) return;
  const rows = await scheduledPostService.listForWorkspace(workspaceId, {
    status: parseStatusFilter(req.query.status),
    from: req.query.from,
    to: req.query.to,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json(rows);
}

async function getOne(req, res) {
  const row = await scheduledPostService.getById(req.params.id);
  res.json(row);
}

async function create(req, res) {
  const workspaceId = requireWorkspace(req, res);
  if (!workspaceId) return;
  const row = await scheduledPostService.createScheduledPost(
    workspaceId,
    req.body,
  );
  res.status(201).json(row);
}

async function update(req, res) {
  const row = await scheduledPostService.updateScheduledPost(
    req.params.id,
    req.body,
  );
  res.json(row);
}

async function cancel(req, res) {
  const row = await scheduledPostService.cancelScheduledPost(req.params.id);
  res.json(row);
}

async function remove(req, res) {
  const out = await scheduledPostService.deleteScheduledPost(req.params.id);
  res.json(out);
}

async function publishNow(req, res) {
  const summary = await scheduledPostService.publishDuePosts({
    limit: Number(req.body?.limit) || 20,
    // Accept an override `now` so staging can force-publish future posts.
    now: req.body?.now ? new Date(req.body.now) : new Date(),
  });
  res.json(summary);
}

async function calendar(req, res) {
  const workspaceId = requireWorkspace(req, res);
  if (!workspaceId) return;
  const data = await scheduledPostService.getCalendar(workspaceId, {
    from: req.query.from,
    to: req.query.to,
    region: req.query.region,
  });
  res.json(data);
}

module.exports = {
  list,
  getOne,
  create,
  update,
  cancel,
  remove,
  publishNow,
  calendar,
};
