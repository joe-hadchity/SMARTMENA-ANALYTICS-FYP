/**
 * trendReadService -- read-path queries for the /trends UI.
 *
 * Uses the `v_trend_window_base` view created in schema_v11 and applies the
 * time window / sort at query time. Intentionally does NO aggregation in
 * JS unless a metric (e.g. prev_window_delta) requires it -- the heavy
 * lifting has already been done at write time into `trend_snapshots`.
 */

const { getSupabase } = require("../../config/supabase");

const VIEW = "v_trend_window_base";

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

function daysAgoIso(days) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// list() -- one row per (trend_term) for a window, sorted.
// ---------------------------------------------------------------------------

/**
 * Query windows of trend data.
 *
 * @param {Object} opts
 * @param {string} opts.workspaceId
 * @param {("hashtag"|"topic"|"format"|"sound"|"all")} [opts.kind="all"]
 * @param {number} [opts.windowDays=7]   7 | 14 | 30
 * @param {("volume"|"engagement"|"avg_engagement")} [opts.sortBy="volume"]
 * @param {number} [opts.limit=50]
 * @param {string} [opts.platform]       filter on platform_breakdown key
 * @param {("own"|"competitor"|"all")} [opts.source="all"]
 * @param {string} [opts.search]         substring match on display_label
 * @returns {Promise<Array>}
 */
async function listTrends({
  workspaceId,
  kind = "all",
  windowDays = 7,
  sortBy = "volume",
  limit = 50,
  platform,
  source = "all",
  search,
} = {}) {
  if (!workspaceId) throw new Error("listTrends: workspaceId required");
  const supabase = requireClient();

  const sinceDate = daysAgoIso(windowDays);
  const prevSinceDate = daysAgoIso(windowDays * 2);
  const prevEndDate = daysAgoIso(windowDays);

  // ------------------ current window ------------------
  let q = supabase
    .from(VIEW)
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("day", sinceDate)
    .limit(5000);
  if (kind !== "all") q = q.eq("kind", kind);
  const { data: current, error: currentErr } = await q;
  if (currentErr) {
    const err = new Error(currentErr.message || "Failed to query trends");
    err.status = 500;
    throw err;
  }

  // ------------------ previous window (for delta) ------------------
  let pq = supabase
    .from(VIEW)
    .select("trend_term_id, post_count, engagement_sum")
    .eq("workspace_id", workspaceId)
    .gte("day", prevSinceDate)
    .lt("day", prevEndDate)
    .limit(5000);
  if (kind !== "all") pq = pq.eq("kind", kind);
  const { data: previous } = await pq;

  // ------------------ aggregate by term ------------------
  const byTerm = new Map();
  for (const row of current || []) {
    // filter by platform / source in-memory (cheap; row count is small)
    if (platform) {
      const breakdown = row.platform_breakdown || {};
      if (!breakdown[platform]) continue;
    }
    if (source !== "all") {
      const sb = row.source_breakdown || {};
      if (!sb[source]) continue;
    }

    const id = row.trend_term_id;
    let agg = byTerm.get(id);
    if (!agg) {
      agg = {
        trend_term_id: id,
        workspace_id: row.workspace_id,
        kind: row.kind,
        value: row.value,
        display_label: row.display_label,
        metadata: row.term_metadata || {},
        post_count: 0,
        engagement_sum: 0,
        unique_authors: 0,
        platform_breakdown: {},
        source_breakdown: {},
        samples: [],
        daily: [], // [{day, post_count, engagement_sum}]
        last_active_day: null,
      };
      byTerm.set(id, agg);
    }
    agg.post_count += row.post_count || 0;
    agg.engagement_sum += Number(row.engagement_sum || 0);
    agg.unique_authors = Math.max(agg.unique_authors, row.unique_authors || 0);
    agg.last_active_day =
      !agg.last_active_day || row.day > agg.last_active_day
        ? row.day
        : agg.last_active_day;
    for (const [k, v] of Object.entries(row.platform_breakdown || {})) {
      agg.platform_breakdown[k] = (agg.platform_breakdown[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(row.source_breakdown || {})) {
      agg.source_breakdown[k] = (agg.source_breakdown[k] || 0) + v;
    }
    for (const s of row.sample_post_ids || []) agg.samples.push(s);
    agg.daily.push({
      day: row.day,
      post_count: row.post_count || 0,
      engagement_sum: Number(row.engagement_sum || 0),
    });
  }

  // Merge previous window counts.
  const prevByTerm = new Map();
  for (const row of previous || []) {
    const cur = prevByTerm.get(row.trend_term_id) || { post_count: 0, engagement_sum: 0 };
    cur.post_count += row.post_count || 0;
    cur.engagement_sum += Number(row.engagement_sum || 0);
    prevByTerm.set(row.trend_term_id, cur);
  }

  // Finalize output.
  const out = [];
  for (const agg of byTerm.values()) {
    const prev = prevByTerm.get(agg.trend_term_id);
    const pct = (cur, p) => {
      if (!p || p === 0) return cur > 0 ? 100 : 0;
      return Number((((cur - p) / p) * 100).toFixed(1));
    };

    // Build a dense sparkline over the full window so the UI can render
    // zero days as gaps.
    const sparkline = buildSparkline(agg.daily, windowDays);

    out.push({
      trend_term_id: agg.trend_term_id,
      kind: agg.kind,
      value: agg.value,
      display_label: agg.display_label,
      metadata: agg.metadata,
      post_count: agg.post_count,
      engagement_sum: agg.engagement_sum,
      engagement_avg:
        agg.post_count > 0
          ? Number((agg.engagement_sum / agg.post_count).toFixed(2))
          : 0,
      unique_authors: agg.unique_authors,
      platform_breakdown: agg.platform_breakdown,
      source_breakdown: agg.source_breakdown,
      last_active_day: agg.last_active_day,
      prev_post_count: prev?.post_count || 0,
      prev_engagement_sum: prev?.engagement_sum || 0,
      delta_post_count_pct: pct(agg.post_count, prev?.post_count || 0),
      delta_engagement_pct: pct(agg.engagement_sum, prev?.engagement_sum || 0),
      sparkline,
      samples: agg.samples
        .sort((a, z) => (z.engagement || 0) - (a.engagement || 0))
        .slice(0, 3),
    });
  }

  // Apply search.
  let filtered = out;
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = out.filter(
      (t) =>
        t.value.toLowerCase().includes(s) ||
        (t.display_label || "").toLowerCase().includes(s),
    );
  }

  // Sort.
  filtered.sort((a, b) => {
    if (sortBy === "engagement") {
      return b.engagement_sum - a.engagement_sum;
    }
    if (sortBy === "avg_engagement") {
      return b.engagement_avg - a.engagement_avg;
    }
    return b.post_count - a.post_count;
  });

  return filtered.slice(0, Math.min(limit, 200));
}

function buildSparkline(daily, windowDays) {
  const map = new Map();
  for (const d of daily) map.set(d.day, d);
  const out = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = windowDays - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = isoDate(d);
    const hit = map.get(key);
    out.push({
      day: key,
      post_count: hit?.post_count || 0,
      engagement_sum: hit?.engagement_sum || 0,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// getTrendDetail() -- one term with full daily series + samples.
// ---------------------------------------------------------------------------

async function getTrendDetail({ workspaceId, trendTermId, windowDays = 30 }) {
  const supabase = requireClient();
  const sinceDate = daysAgoIso(windowDays);

  const { data: termRow, error: termErr } = await supabase
    .from("trend_terms")
    .select("*")
    .eq("id", trendTermId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (termErr) {
    const err = new Error(termErr.message || "Failed to load trend term");
    err.status = 500;
    throw err;
  }
  if (!termRow) {
    const err = new Error("Trend term not found");
    err.status = 404;
    throw err;
  }

  const { data: snaps, error: snapErr } = await supabase
    .from("trend_snapshots")
    .select("*")
    .eq("trend_term_id", trendTermId)
    .gte("day", sinceDate)
    .order("day", { ascending: true });
  if (snapErr) {
    const err = new Error(snapErr.message || "Failed to load snapshots");
    err.status = 500;
    throw err;
  }

  // Top samples across all days.
  const allSamples = [];
  for (const s of snaps || []) {
    for (const sm of s.sample_post_ids || []) {
      allSamples.push({ ...sm, day: s.day });
    }
  }
  allSamples.sort((a, z) => (z.engagement || 0) - (a.engagement || 0));

  return {
    term: termRow,
    window_days: windowDays,
    sparkline: buildSparkline(
      (snaps || []).map((s) => ({
        day: s.day,
        post_count: s.post_count,
        engagement_sum: Number(s.engagement_sum || 0),
      })),
      windowDays,
    ),
    totals: (snaps || []).reduce(
      (acc, s) => {
        acc.post_count += s.post_count || 0;
        acc.engagement_sum += Number(s.engagement_sum || 0);
        acc.unique_authors = Math.max(acc.unique_authors, s.unique_authors || 0);
        return acc;
      },
      { post_count: 0, engagement_sum: 0, unique_authors: 0 },
    ),
    top_samples: allSamples.slice(0, 10),
  };
}

module.exports = {
  listTrends,
  getTrendDetail,
  buildSparkline,
};
