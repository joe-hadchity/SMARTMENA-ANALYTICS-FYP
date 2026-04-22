/**
 * syncJobService -- persistence for connector sync jobs.
 *
 * A sync job is a durable record of a provider ingestion attempt (real or
 * mock): "on 2026-04-21 at 09:30, I ran a posts_sync for Instagram account X,
 * it completed in 2.1s and upserted 24 rows". Jobs exist so the product can:
 *   * show "last sync status" per account on the Connections page,
 *   * surface failure reasons (`error_message`) without log-diving,
 *   * retain an audit trail once real OAuth lands.
 *
 * For the beta the inline sync path writes jobs directly; a future worker /
 * queue would insert a 'pending' row, flip it to 'running' when picked up,
 * and finalise as 'completed' / 'failed'.
 */

const db = require("./dbService");

const TABLE = "sync_jobs";

async function listSyncJobs({ workspaceId, accountId, platform, status, limit } = {}) {
  const filters = {};
  if (workspaceId) filters.workspace_id = workspaceId;
  if (accountId) filters.account_id = accountId;
  if (platform) filters.platform = platform;
  if (status) filters.status = status;

  return db.list(TABLE, {
    filters: Object.keys(filters).length ? filters : undefined,
    orderBy: "created_at",
    ascending: false,
    limit,
  });
}

async function getSyncJobById(id) {
  return db.getById(TABLE, id);
}

async function createSyncJob({
  workspaceId,
  platform,
  accountId,
  jobType,
  status,
  startedAt,
  completedAt,
  errorMessage,
}) {
  if (!workspaceId) {
    const err = new Error("workspace_id is required");
    err.status = 400;
    throw err;
  }

  const effectiveStatus = status ?? "pending";
  const effectiveStartedAt =
    startedAt ?? (effectiveStatus === "pending" ? null : new Date().toISOString());

  return db.insert(TABLE, {
    workspace_id: workspaceId,
    platform,
    account_id: accountId ?? null,
    job_type: jobType,
    status: effectiveStatus,
    started_at: effectiveStartedAt,
    completed_at: completedAt ?? null,
    error_message: errorMessage ?? null,
  });
}

/**
 * Mark a job as running. Stamps `started_at` if not already set.
 */
async function markRunning(jobId) {
  return db.update(TABLE, jobId, {
    status: "running",
    started_at: new Date().toISOString(),
  });
}

/**
 * Mark a job as completed. Stamps `completed_at = now()`.
 */
async function markCompleted(jobId) {
  return db.update(TABLE, jobId, {
    status: "completed",
    completed_at: new Date().toISOString(),
    error_message: null,
  });
}

/**
 * Mark a job as failed with a short error message (truncated to 2000 chars
 * to match the validator / column expectations).
 */
async function markFailed(jobId, errorMessage) {
  const msg = String(errorMessage || "Unknown error").slice(0, 2000);
  return db.update(TABLE, jobId, {
    status: "failed",
    completed_at: new Date().toISOString(),
    error_message: msg,
  });
}

module.exports = {
  TABLE,
  listSyncJobs,
  getSyncJobById,
  createSyncJob,
  markRunning,
  markCompleted,
  markFailed,
};
