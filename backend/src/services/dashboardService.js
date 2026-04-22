/**
 * dashboardService -- workspace-level analytics summary built from the v4
 * storage tables (social_posts, post_metrics_snapshots, audience_snapshots)
 * plus v2 social_accounts and v3 sync_jobs counts.
 *
 * Everything is aggregated in Node so the service survives on a stock
 * Supabase free tier (no SQL views, no RPCs). If/when volumes grow this
 * can be swapped for a Postgres function without changing the HTTP shape.
 */

const db = require("./dbService");
const { getSupabase } = require("../config/supabase");
const audienceSnapshotService = require("./audienceSnapshotService");

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.status = 503;
    throw err;
  }
  return supabase;
}

/**
 * Latest metrics snapshot per social_post. Supabase has no
 * `distinct on (social_post_id)` through PostgREST, so we pull ordered
 * rows and reduce in memory.
 */
async function getLatestMetricsByPost(socialPostIds) {
  if (!socialPostIds || socialPostIds.length === 0) return {};
  const supabase = requireClient();

  const { data, error } = await supabase
    .from("post_metrics_snapshots")
    .select("*")
    .in("social_post_id", socialPostIds)
    .order("snapshot_time", { ascending: false });

  if (error) return {};
  const byPost = {};
  for (const row of data || []) {
    if (!byPost[row.social_post_id]) byPost[row.social_post_id] = row;
  }
  return byPost;
}

async function countSyncJobsByStatus(workspaceId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("sync_jobs")
    .select("status")
    .eq("workspace_id", workspaceId);
  if (error) {
    // sync_jobs table may not exist yet (schema_v3.sql not applied).
    // Return an empty count rather than failing the whole summary.
    return { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
  }
  const counts = { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
  for (const row of data || []) {
    if (counts[row.status] !== undefined) counts[row.status] += 1;
  }
  return counts;
}

/**
 * Compose a workspace-level dashboard summary. Shape is intentionally
 * flat and easy to render, with nested `accountsBreakdown` for per-account
 * cards. All numeric fields default to 0 when no data is available.
 */
async function getWorkspaceSummary(workspaceId) {
  // Existence check -- 404s cleanly.
  const workspace = await db.getById("workspaces", workspaceId);

  const supabase = requireClient();

  // 1. Social accounts in this workspace.
  const { data: accounts, error: accErr } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (accErr) {
    const err = new Error(accErr.message || "Failed to list social accounts");
    err.status = 400;
    err.details = { code: accErr.code };
    throw err;
  }

  const accountIds = (accounts || []).map((a) => a.id);

  // 2. Social posts for those accounts.
  let posts = [];
  if (accountIds.length > 0) {
    const { data: postRows, error: postErr } = await supabase
      .from("social_posts")
      .select("*")
      .in("social_account_id", accountIds)
      .order("published_at", { ascending: false });
    if (postErr) {
      // social_posts table may not exist yet (schema_v4.sql not applied).
      posts = [];
    } else {
      posts = postRows || [];
    }
  }

  const postIds = posts.map((p) => p.id);

  // 3. Latest metrics snapshot per post (new table).
  const latestMetricsByPost = await getLatestMetricsByPost(postIds);

  // 4. Latest audience snapshot per account.
  const latestAudienceByAccount =
    await audienceSnapshotService.getLatestSnapshotsForAccounts(accountIds);

  // 5. Sync-job status counts.
  const syncJobCounts = await countSyncJobsByStatus(workspaceId);

  // 6. Roll-ups.
  let totalImpressions = 0;
  let totalReach = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalSaves = 0;
  let totalShares = 0;
  let erSum = 0;
  let erCount = 0;

  for (const m of Object.values(latestMetricsByPost)) {
    totalImpressions += m.impressions || 0;
    totalReach += m.reach || 0;
    totalLikes += m.likes || 0;
    totalComments += m.comments || 0;
    totalSaves += m.saves || 0;
    totalShares += m.shares || 0;
    if (m.engagement_rate != null) {
      erSum += Number(m.engagement_rate);
      erCount += 1;
    }
  }

  const totalEngagements = totalLikes + totalComments + totalSaves + totalShares;
  const avgEngagementRate = erCount > 0 ? erSum / erCount : 0;

  let totalFollowers = 0;
  let totalFollowing = 0;
  let totalProfileViews = 0;
  for (const aud of Object.values(latestAudienceByAccount)) {
    totalFollowers += aud.followers_count || 0;
    totalFollowing += aud.following_count || 0;
    totalProfileViews += aud.profile_views || 0;
  }

  // 7. Per-account breakdown so the UI can draw per-platform cards.
  const accountsBreakdown = (accounts || []).map((a) => {
    const audience = latestAudienceByAccount[a.id];
    return {
      social_account_id: a.id,
      platform: a.provider,
      handle: a.handle,
      display_name: a.display_name,
      status: a.status,
      last_synced_at: a.last_synced_at,
      followers_count: audience ? audience.followers_count : 0,
      following_count: audience ? audience.following_count : 0,
      profile_views: audience ? audience.profile_views : 0,
      audience_captured_at: audience ? audience.snapshot_time : null,
      posts_count: posts.filter((p) => p.social_account_id === a.id).length,
    };
  });

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      region_default: workspace.region_default,
      locale_default: workspace.locale_default,
    },
    totals: {
      connectedAccounts: accounts.length,
      socialPosts: posts.length,
      totalFollowers,
      totalFollowing,
      totalProfileViews,
      totalImpressions,
      totalReach,
      totalLikes,
      totalComments,
      totalSaves,
      totalShares,
      totalEngagements,
      avgEngagementRate: Number(avgEngagementRate.toFixed(5)),
    },
    syncJobs: syncJobCounts,
    accountsBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getWorkspaceSummary,
};
