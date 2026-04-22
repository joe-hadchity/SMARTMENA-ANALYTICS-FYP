/**
 * recommendationService -- persistent, workspace-scoped recommendations
 * (schema_v5 `recommendations` table).
 *
 * Distinct from the existing `recommendationsService.js` which is the
 * stateless MENA playbook engine (`POST /api/recommendations/mena`). That
 * service stays untouched; this one adds durable, list-able records for
 * the dashboard and keeps them explainable with plain fields.
 */

const db = require("./dbService");

const TABLE = "recommendations";

const TYPES = [
  "content",
  "posting_time",
  "mena_event",
  "audience",
  "budget",
  "other",
];

const PRIORITIES = ["low", "medium", "high"];

async function listRecommendationsForWorkspace(
  workspaceId,
  { recommendationType, priority, limit } = {},
) {
  // Ensure the workspace exists (404s cleanly via dbService.getById).
  await db.getById("workspaces", workspaceId);

  const filters = { workspace_id: workspaceId };
  if (recommendationType) filters.recommendation_type = recommendationType;
  if (priority) filters.priority = priority;

  return db.list(TABLE, {
    filters,
    orderBy: "created_at",
    ascending: false,
    limit,
  });
}

async function getRecommendationById(id) {
  return db.getById(TABLE, id);
}

async function createRecommendation({
  workspaceId,
  recommendationType,
  title,
  description,
  priority,
  data,
}) {
  if (!workspaceId) {
    const err = new Error("workspace_id is required");
    err.status = 400;
    throw err;
  }
  if (!TYPES.includes(recommendationType)) {
    const err = new Error(`Unsupported recommendation_type: ${recommendationType}`);
    err.status = 400;
    throw err;
  }
  if (priority && !PRIORITIES.includes(priority)) {
    const err = new Error(`Unsupported priority: ${priority}`);
    err.status = 400;
    throw err;
  }
  if (!title) {
    const err = new Error("title is required");
    err.status = 400;
    throw err;
  }

  return db.insert(TABLE, {
    workspace_id: workspaceId,
    recommendation_type: recommendationType,
    title,
    description: description ?? null,
    priority: priority ?? "medium",
    data: data ?? {},
  });
}

/**
 * Bulk-insert helper. Accepts rows in snake_case so callers (seeder,
 * controllers) don't need to map camelCase -> snake_case.
 * Silently skips rows missing required fields.
 */
async function createRecommendationsForWorkspace(workspaceId, rows = []) {
  if (!workspaceId) {
    const err = new Error("workspace_id is required");
    err.status = 400;
    throw err;
  }
  const valid = (rows || [])
    .filter(
      (r) =>
        r &&
        r.title &&
        TYPES.includes(r.recommendation_type) &&
        (!r.priority || PRIORITIES.includes(r.priority)),
    )
    .map((r) => ({
      workspace_id: workspaceId,
      recommendation_type: r.recommendation_type,
      title: r.title,
      description: r.description ?? null,
      priority: r.priority ?? "medium",
      data: r.data ?? {},
    }));

  if (valid.length === 0) return [];
  return db.insertMany(TABLE, valid);
}

module.exports = {
  TABLE,
  TYPES,
  PRIORITIES,
  listRecommendationsForWorkspace,
  getRecommendationById,
  createRecommendation,
  createRecommendationsForWorkspace,
};
