/**
 * audienceSnapshotService -- append-only time-series of audience-level
 * stats per connected social account (followers, following, profile views).
 */

const db = require("./dbService");
const { getSupabase } = require("../config/supabase");

const TABLE = "audience_snapshots";

async function listSnapshotsForAccount(
  socialAccountId,
  { from, to, limit, ascending = true } = {},
) {
  await db.getById("social_accounts", socialAccountId);

  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.status = 503;
    throw err;
  }

  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("social_account_id", socialAccountId)
    .order("snapshot_time", { ascending });

  if (from) query = query.gte("snapshot_time", from);
  if (to) query = query.lte("snapshot_time", to);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    const err = new Error(error.message || "Failed to list audience snapshots");
    err.status = 400;
    err.details = { code: error.code };
    throw err;
  }
  return data || [];
}

/**
 * Resolve the most-recent snapshot per account in a single round-trip.
 * Supabase doesn't expose `distinct on` through PostgREST, so we fetch
 * rows ordered by snapshot_time desc and reduce in memory. Fine for
 * dashboard-summary payloads (bounded by account count per workspace).
 */
async function getLatestSnapshotsForAccounts(socialAccountIds) {
  if (!socialAccountIds || socialAccountIds.length === 0) return {};

  const supabase = getSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("social_account_id", socialAccountIds)
    .order("snapshot_time", { ascending: false });

  if (error) return {};
  const byAccount = {};
  for (const row of data || []) {
    if (!byAccount[row.social_account_id]) {
      byAccount[row.social_account_id] = row;
    }
  }
  return byAccount;
}

async function createSnapshot({
  socialAccountId,
  snapshotTime,
  followersCount,
  followingCount,
  profileViews,
  metadataJson,
}) {
  if (!socialAccountId) {
    const err = new Error("social_account_id is required");
    err.status = 400;
    throw err;
  }

  return db.insert(TABLE, {
    social_account_id: socialAccountId,
    snapshot_time: snapshotTime ?? new Date().toISOString(),
    followers_count: followersCount ?? 0,
    following_count: followingCount ?? 0,
    profile_views: profileViews ?? 0,
    metadata_json: metadataJson ?? {},
  });
}

module.exports = {
  TABLE,
  listSnapshotsForAccount,
  getLatestSnapshotsForAccounts,
  createSnapshot,
};
