const { z } = require("zod");

const PLATFORMS = ["meta_instagram", "meta_facebook", "tiktok", "x"];

const JOB_TYPES = [
  "posts_sync",
  "metrics_sync",
  "account_refresh",
  "full_sync",
];

const JOB_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
];

// POST /api/sync-jobs -- enqueue (or record) a sync attempt.
// `workspace_id` is optional on the wire: when omitted, the workspaceContext
// middleware resolves it from the x-workspace-id header.
const createSyncJobSchema = z
  .object({
    workspace_id: z.string().uuid().optional(),
    platform: z.enum(PLATFORMS),
    account_id: z.string().uuid().optional(),
    job_type: z.enum(JOB_TYPES),
    status: z.enum(JOB_STATUSES).optional(),
    started_at: z.string().datetime().optional(),
    completed_at: z.string().datetime().optional(),
    error_message: z.string().max(2000).optional(),
  })
  .refine(
    (v) =>
      !(v.status === "completed" || v.status === "failed") ||
      Boolean(v.completed_at),
    {
      path: ["completed_at"],
      message: "completed_at is required when status is 'completed' or 'failed'",
    },
  );

const listSyncJobsQuerySchema = z.object({
  platform: z.enum(PLATFORMS).optional(),
  status: z.enum(JOB_STATUSES).optional(),
  accountId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

module.exports = {
  createSyncJobSchema,
  listSyncJobsQuerySchema,
  PLATFORMS,
  JOB_TYPES,
  JOB_STATUSES,
};
