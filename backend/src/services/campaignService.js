const db = require("./dbService");
const { getSupabase } = require("../config/supabase");

const TABLE = "campaigns";

async function createCampaign(payload) {
  return db.insert(TABLE, payload);
}

async function listCampaigns({ workspaceId, limit = 100 } = {}) {
  return db.list(TABLE, {
    filters: workspaceId ? { workspace_id: workspaceId } : undefined,
    orderBy: "created_at",
    ascending: false,
    limit,
  });
}

/**
 * Fetch a campaign with its latest prediction and linked posts.
 * Uses Supabase relational select so it stays one round-trip.
 */
async function getCampaignWithRelations(id) {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.status = 503;
    throw err;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select(
      [
        "*",
        "posts:posts(id, text_content, language, created_at)",
        "predictions:predictions(id, predicted_roi, predicted_engagement, confidence_score, created_at)",
      ].join(", "),
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const err = new Error(error.message || "Failed to load campaign");
    err.status = 400;
    err.details = { code: error.code };
    throw err;
  }
  if (!data) {
    const err = new Error(`campaign ${id} not found`);
    err.status = 404;
    throw err;
  }

  // Keep only the latest prediction for convenience; callers can still see
  // the full array under `predictions`.
  const predictions = Array.isArray(data.predictions) ? data.predictions : [];
  const latestPrediction =
    predictions.length > 0
      ? predictions
          .slice()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      : null;

  return { ...data, latest_prediction: latestPrediction };
}

module.exports = {
  TABLE,
  createCampaign,
  listCampaigns,
  getCampaignWithRelations,
};
