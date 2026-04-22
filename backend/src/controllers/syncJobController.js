const syncJobService = require("../services/syncJobService");

async function listSyncJobs(req, res) {
  const rows = await syncJobService.listSyncJobs({
    workspaceId: req.workspaceId,
    accountId: req.query.accountId,
    platform: req.query.platform,
    status: req.query.status,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json(rows);
}

async function getSyncJob(req, res) {
  const row = await syncJobService.getSyncJobById(req.params.id);
  res.json(row);
}

async function createSyncJob(req, res) {
  const row = await syncJobService.createSyncJob({
    workspaceId: req.body.workspace_id || req.workspaceId,
    platform: req.body.platform,
    accountId: req.body.account_id,
    jobType: req.body.job_type,
    status: req.body.status,
    startedAt: req.body.started_at,
    completedAt: req.body.completed_at,
    errorMessage: req.body.error_message,
  });
  res.status(201).json(row);
}

module.exports = {
  listSyncJobs,
  getSyncJob,
  createSyncJob,
};
