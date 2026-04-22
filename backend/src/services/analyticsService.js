/**
 * analyticsService -- aggregations over the workspace's synced_posts,
 * post_metrics, sentiment_results, campaigns, and predictions tables.
 *
 * All functions are scoped by workspaceId. Aggregation happens in Node
 * rather than SQL to keep the beta simple; indexes on the relevant
 * columns (workspace_id, captured_at, social_account_id) keep the
 * underlying queries fast enough for demo-scale data.
 */

const { getSupabase } = require("../config/supabase");

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

function throwIf(error, msg) {
  if (!error) return;
  const err = new Error(msg || error.message);
  err.status = 400;
  err.details = { code: error.code };
  throw err;
}

function latestByKey(rows, keyField, timeField) {
  const latest = new Map();
  for (const row of rows) {
    const key = row[keyField];
    const prev = latest.get(key);
    if (!prev || new Date(row[timeField]) > new Date(prev[timeField])) {
      latest.set(key, row);
    }
  }
  return latest;
}

async function fetchSyncedPostsWithLatestMetrics(workspaceId) {
  const supabase = requireClient();

  const postsRes = await supabase
    .from("synced_posts")
    .select(
      "id, workspace_id, social_account_id, post_type, caption, caption_lang, permalink, posted_at",
    )
    .eq("workspace_id", workspaceId)
    .limit(2000);
  throwIf(postsRes.error, "Failed to load synced posts");

  const posts = postsRes.data || [];
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  const metricsRes = await supabase
    .from("post_metrics")
    .select("*")
    .in("synced_post_id", postIds)
    .limit(20000);
  throwIf(metricsRes.error, "Failed to load metrics");

  const latestMetrics = latestByKey(
    metricsRes.data || [],
    "synced_post_id",
    "captured_at",
  );

  return posts.map((p) => ({
    ...p,
    latestMetrics: latestMetrics.get(p.id) || null,
  }));
}

async function fetchAccounts(workspaceId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, provider, handle, display_name")
    .eq("workspace_id", workspaceId);
  throwIf(error, "Failed to load social accounts");
  return data || [];
}

async function fetchCampaigns(workspaceId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, platform, region, budget, created_at")
    .eq("workspace_id", workspaceId);
  throwIf(error, "Failed to load campaigns");
  return data || [];
}

async function fetchLatestPredictionsForWorkspace(workspaceId) {
  const supabase = requireClient();
  // Join via campaigns to only get predictions for this workspace.
  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .select("id")
    .eq("workspace_id", workspaceId);
  throwIf(campErr, "Failed to scope predictions");

  const ids = (campaigns || []).map((c) => c.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .in("campaign_id", ids);
  throwIf(error, "Failed to load predictions");

  const latest = latestByKey(data || [], "campaign_id", "created_at");
  return Array.from(latest.values());
}

async function fetchSentimentResultsForWorkspace(workspaceId) {
  const supabase = requireClient();
  // Scope via posts.workspace_id.
  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select("id")
    .eq("workspace_id", workspaceId);
  throwIf(postsErr, "Failed to scope sentiment");

  const ids = (posts || []).map((p) => p.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("sentiment_results")
    .select("*")
    .in("post_id", ids);
  throwIf(error, "Failed to load sentiment");
  return data || [];
}

function sentimentToScore(label) {
  if (label === "positive") return 1;
  if (label === "negative") return -1;
  return 0;
}

// ---------------------------------------------------------------------------
// Public aggregations
// ---------------------------------------------------------------------------

async function getOverview(workspaceId) {
  const [posts, accounts, campaigns, predictions, sentiments] = await Promise.all([
    fetchSyncedPostsWithLatestMetrics(workspaceId),
    fetchAccounts(workspaceId),
    fetchCampaigns(workspaceId),
    fetchLatestPredictionsForWorkspace(workspaceId),
    fetchSentimentResultsForWorkspace(workspaceId),
  ]);

  let totalReach = 0;
  let totalImpressions = 0;
  let totalEngagements = 0;
  let engagementRateSum = 0;
  let engagementRateCount = 0;

  for (const p of posts) {
    const m = p.latestMetrics;
    if (!m) continue;
    totalReach += m.reach || 0;
    totalImpressions += m.impressions || 0;
    totalEngagements += (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);
    if (m.engagement_rate != null) {
      engagementRateSum += Number(m.engagement_rate);
      engagementRateCount += 1;
    }
  }

  const avgEngagementRate =
    engagementRateCount > 0 ? engagementRateSum / engagementRateCount : null;

  const avgSentiment =
    sentiments.length > 0
      ? sentiments.reduce((acc, s) => acc + sentimentToScore(s.sentiment), 0) /
        sentiments.length
      : null;

  const avgPredictedRoi =
    predictions.length > 0
      ? predictions.reduce((acc, p) => acc + Number(p.predicted_roi || 0), 0) /
        predictions.length
      : null;

  return {
    totals: {
      connectedAccounts: accounts.length,
      syncedPosts: posts.length,
      campaigns: campaigns.length,
      predictions: predictions.length,
      sentimentResults: sentiments.length,
      reach: totalReach,
      impressions: totalImpressions,
      engagements: totalEngagements,
    },
    averages: {
      engagementRate:
        avgEngagementRate != null ? Number(avgEngagementRate.toFixed(5)) : null,
      sentimentScore: avgSentiment != null ? Number(avgSentiment.toFixed(4)) : null,
      predictedRoi: avgPredictedRoi != null ? Number(avgPredictedRoi.toFixed(4)) : null,
    },
  };
}

function startOfBucket(date, groupBy) {
  const d = new Date(date);
  if (groupBy === "week") {
    // ISO week: snap to the Monday 00:00 UTC of that week.
    const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
    d.setUTCDate(d.getUTCDate() - day);
  }
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getTimeseries(workspaceId, { metric = "engagement", groupBy = "day" } = {}) {
  const supabase = requireClient();

  // Pull the posts scoped to workspace, then pull their metrics and roll up.
  const { data: posts, error: postsErr } = await supabase
    .from("synced_posts")
    .select("id, workspace_id")
    .eq("workspace_id", workspaceId);
  throwIf(postsErr, "Failed to load synced posts");

  const ids = (posts || []).map((p) => p.id);
  if (ids.length === 0) return { metric, groupBy, points: [] };

  const { data: metrics, error } = await supabase
    .from("post_metrics")
    .select("*")
    .in("synced_post_id", ids)
    .order("captured_at", { ascending: true })
    .limit(20000);
  throwIf(error, "Failed to load metrics");

  const buckets = new Map();
  for (const m of metrics || []) {
    const key = startOfBucket(m.captured_at, groupBy);
    if (!buckets.has(key)) {
      buckets.set(key, { bucket: key, reach: 0, impressions: 0, engagement: 0, samples: 0 });
    }
    const b = buckets.get(key);
    b.reach += m.reach || 0;
    b.impressions += m.impressions || 0;
    b.engagement +=
      (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);
    b.samples += 1;
  }

  const points = Array.from(buckets.values())
    .sort((a, b) => new Date(a.bucket) - new Date(b.bucket))
    .map((b) => ({
      bucket: b.bucket,
      value:
        metric === "reach"
          ? b.reach
          : metric === "impressions"
            ? b.impressions
            : b.engagement,
      samples: b.samples,
    }));

  return { metric, groupBy, points };
}

async function getPlatformBreakdown(workspaceId) {
  const [posts, accounts] = await Promise.all([
    fetchSyncedPostsWithLatestMetrics(workspaceId),
    fetchAccounts(workspaceId),
  ]);

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const byProvider = new Map();

  for (const p of posts) {
    const account = accountById.get(p.social_account_id);
    if (!account) continue;
    const key = account.provider;
    if (!byProvider.has(key)) {
      byProvider.set(key, {
        provider: key,
        posts: 0,
        reach: 0,
        impressions: 0,
        engagements: 0,
      });
    }
    const row = byProvider.get(key);
    row.posts += 1;
    const m = p.latestMetrics;
    if (m) {
      row.reach += m.reach || 0;
      row.impressions += m.impressions || 0;
      row.engagements +=
        (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);
    }
  }

  return Array.from(byProvider.values()).sort((a, b) => b.engagements - a.engagements);
}

async function getSentimentBreakdown(workspaceId) {
  const rows = await fetchSentimentResultsForWorkspace(workspaceId);
  const counts = { positive: 0, neutral: 0, negative: 0 };
  let confSum = 0;
  for (const r of rows) {
    if (counts[r.sentiment] != null) counts[r.sentiment] += 1;
    if (r.confidence != null) confSum += Number(r.confidence);
  }
  const total = rows.length;
  return {
    total,
    counts,
    shares: {
      positive: total > 0 ? counts.positive / total : 0,
      neutral: total > 0 ? counts.neutral / total : 0,
      negative: total > 0 ? counts.negative / total : 0,
    },
    avgConfidence: total > 0 ? Number((confSum / total).toFixed(4)) : null,
  };
}

async function getTopPosts(workspaceId, { limit = 10, sortBy = "engagement" } = {}) {
  const posts = await fetchSyncedPostsWithLatestMetrics(workspaceId);

  const withScore = posts.map((p) => {
    const m = p.latestMetrics || {};
    const engagement =
      (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);
    let score;
    switch (sortBy) {
      case "reach":
        score = m.reach || 0;
        break;
      case "impressions":
        score = m.impressions || 0;
        break;
      case "engagement_rate":
        score = m.engagement_rate != null ? Number(m.engagement_rate) : 0;
        break;
      case "engagement":
      default:
        score = engagement;
    }
    return { ...p, score, engagement };
  });

  return withScore
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, engagement, latestMetrics, ...rest }) => ({
      ...rest,
      latest_metrics: latestMetrics,
      score,
      engagement,
    }));
}

module.exports = {
  getOverview,
  getTimeseries,
  getPlatformBreakdown,
  getSentimentBreakdown,
  getTopPosts,
};
