const { getSupabase } = require("../../config/supabase");
const env = require("../../config/env");
const apifyHashtagAdapter = require("./hashtagAdapters/apifyHashtagAdapter");
const metaHashtagAdapter = require("./hashtagAdapters/metaHashtagAdapter");

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error("Supabase is not configured.");
    err.status = 503;
    throw err;
  }
  return supabase;
}

async function listTrackedHashtags(workspaceId) {
  const supabase = requireClient();
  const { data: tags, error } = await supabase
    .from("tracked_hashtags")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw schemaAwareError(error);

  const ids = (tags || []).map((tag) => tag.id);
  const snapshots = ids.length ? await loadSnapshots(supabase, ids) : [];
  const grouped = groupSnapshots(snapshots);

  return {
    generated_at: new Date().toISOString(),
    provider: providerStatus().selected,
    real_data_only: true,
    refresh_days: env.HASHTAG_REFRESH_DAYS,
    hashtags: (tags || []).map((tag) => decorateTag(tag, grouped.get(tag.id) || [])),
    suggested_hashtags: defaultSuggestions(),
    provider_status: providerStatus(),
    warnings: providerWarnings(),
  };
}

async function searchHashtags(query) {
  const clean = apifyHashtagAdapter.normalizeTag(query);
  if (!clean) {
    const err = new Error("Search query is required.");
    err.status = 400;
    throw err;
  }

  const meta = await metaHashtagAdapter.searchHashtag({ query: clean });
  return {
    generated_at: new Date().toISOString(),
    query: clean,
    provider: "meta_graph",
    real_data_only: true,
    results: meta.hashtag ? [meta.hashtag] : [],
    warnings: meta.warnings || [],
    provider_status: providerStatus(),
  };
}

async function createTrackedHashtag(workspaceId, input = {}) {
  const supabase = requireClient();
  const tag = apifyHashtagAdapter.normalizeTag(input.tag || input.hashtag || input.name);
  if (!tag) {
    const err = new Error("Hashtag is required.");
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from("tracked_hashtags")
    .upsert(
      {
        workspace_id: workspaceId,
        platform: input.platform || "instagram",
        tag,
        display_name: input.display_name || `#${tag}`,
        source: "apify",
        status: "active",
        metadata_json: {
          ...(input.metadata_json || {}),
          source_url: apifyHashtagAdapter.instagramHashtagUrl(tag),
        },
      },
      { onConflict: "workspace_id,platform,tag" },
    )
    .select()
    .single();

  if (error) throw schemaAwareError(error);
  if (input.refresh === false) return decorateTag(data, []);

  const refreshed = await refreshHashtag(workspaceId, data.id, {
    limit: input.limit || env.HASHTAG_SCRAPE_LIMIT,
  });
  return refreshed.hashtag;
}

async function deleteTrackedHashtag(workspaceId, id) {
  const supabase = requireClient();
  const { error } = await supabase
    .from("tracked_hashtags")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw schemaAwareError(error);
  return { id, deleted: true };
}

async function getHashtagSnapshots(workspaceId, id, { limit = 12 } = {}) {
  const supabase = requireClient();
  const tag = await loadTag(supabase, workspaceId, id);
  const { data, error } = await supabase
    .from("hashtag_snapshots")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("tracked_hashtag_id", id)
    .order("captured_at", { ascending: false })
    .limit(Math.max(1, Math.min(Number(limit || 12), 52)));
  if (error) throw schemaAwareError(error);
  return decorateTag(tag, (data || []).reverse());
}

async function refreshHashtag(workspaceId, id, { limit } = {}) {
  const supabase = requireClient();
  const tag = await loadTag(supabase, workspaceId, id);
  const previous = await latestSnapshot(supabase, id);
  const result = await fetchHashtagMediaWithProvider({
    tag: tag.tag,
    limit: limit || env.HASHTAG_SCRAPE_LIMIT,
  });
  const aggregate = aggregateMedia(result.media || [], previous);

  const { data: snapshot, error } = await supabase
    .from("hashtag_snapshots")
    .insert({
      tracked_hashtag_id: id,
      workspace_id: workspaceId,
      provider: result.provider || "apify",
      source_url: result.source_url || apifyHashtagAdapter.instagramHashtagUrl(tag.tag),
      sample_size: aggregate.sample_size,
      media_count: aggregate.sample_size,
      total_likes: aggregate.total_likes,
      total_comments: aggregate.total_comments,
      total_video_views: aggregate.total_video_views,
      total_engagement: aggregate.total_engagement,
      avg_engagement: aggregate.avg_engagement,
      momentum_score: aggregate.momentum_score,
      top_media_json: aggregate.top_media,
      raw_payload_json: {
        actor_id: result.actor_id || null,
        run_id: result.run_id || null,
        dataset_id: result.dataset_id || null,
        raw_count: result.raw_count || null,
      },
      warnings: result.warnings || [],
    })
    .select()
    .single();

  if (error) throw schemaAwareError(error);

  await supabase
    .from("tracked_hashtags")
    .update({
      last_synced_at: snapshot.captured_at,
      updated_at: new Date().toISOString(),
      metadata_json: {
        ...(tag.metadata_json || {}),
        last_provider: result.provider || "apify",
        last_source_url: result.source_url || null,
        last_warnings: result.warnings || [],
      },
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  const decorated = await getHashtagSnapshots(workspaceId, id);
  return {
    hashtag: decorated,
    snapshot,
    warnings: result.warnings || [],
  };
}

async function refreshDueHashtags({ limit = 3 } = {}) {
  const supabase = requireClient();
  const cutoff = new Date(Date.now() - env.HASHTAG_REFRESH_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("tracked_hashtags")
    .select("*")
    .eq("status", "active")
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(Math.max(1, Number(limit || 3)));

  if (error) throw schemaAwareError(error);

  const results = [];
  for (const tag of data || []) {
    try {
      results.push(await refreshHashtag(tag.workspace_id, tag.id));
    } catch (err) {
      results.push({ hashtag_id: tag.id, error: err.message });
    }
  }
  return {
    checked: data?.length || 0,
    refreshed: results.filter((row) => !row.error).length,
    results,
  };
}

async function loadTag(supabase, workspaceId, id) {
  const { data, error } = await supabase
    .from("tracked_hashtags")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .single();
  if (error) throw schemaAwareError(error);
  return data;
}

async function loadSnapshots(supabase, ids) {
  const { data, error } = await supabase
    .from("hashtag_snapshots")
    .select("*")
    .in("tracked_hashtag_id", ids)
    .order("captured_at", { ascending: true });
  if (error) throw schemaAwareError(error);
  return data || [];
}

async function latestSnapshot(supabase, id) {
  const { data, error } = await supabase
    .from("hashtag_snapshots")
    .select("*")
    .eq("tracked_hashtag_id", id)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw schemaAwareError(error);
  return data || null;
}

function aggregateMedia(media, previous) {
  const rows = (media || []).map((item) => ({
    ...item,
    engagement:
      Number(item.metrics?.engagement || 0) ||
      Number(item.metrics?.likes || 0) + Number(item.metrics?.comments || 0),
  }));
  const totalLikes = sum(rows.map((item) => item.metrics?.likes));
  const totalComments = sum(rows.map((item) => item.metrics?.comments));
  const totalVideoViews = sum(rows.map((item) => item.metrics?.video_views));
  const totalEngagement = sum(rows.map((item) => item.engagement));
  const avgEngagement = rows.length ? totalEngagement / rows.length : 0;
  const previousAvg = Number(previous?.avg_engagement || 0);
  const momentumScore = previousAvg > 0 ? ((avgEngagement - previousAvg) / previousAvg) * 100 : 0;

  return {
    sample_size: rows.length,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_video_views: totalVideoViews,
    total_engagement: totalEngagement,
    avg_engagement: round2(avgEngagement),
    momentum_score: round2(momentumScore),
    top_media: rows
      .slice()
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        caption: item.caption,
        url: item.url,
        author: item.author,
        media_type: item.media_type,
        media_url: item.media_url,
        published_at: item.published_at,
        hashtags: item.hashtags || [],
        metrics: item.metrics || {},
        engagement: item.engagement,
      })),
  };
}

function decorateTag(tag, snapshots) {
  const sorted = (snapshots || [])
    .slice()
    .sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
  const latest = sorted[sorted.length - 1] || null;
  return {
    id: tag.id,
    workspace_id: tag.workspace_id,
    platform: tag.platform,
    tag: tag.tag,
    display_name: tag.display_name || `#${tag.tag}`,
    source: tag.source,
    status: tag.status,
    last_synced_at: tag.last_synced_at,
    created_at: tag.created_at,
    metadata_json: tag.metadata_json || {},
    latest_snapshot: latest ? normalizeSnapshot(latest) : null,
    snapshots: sorted.map(normalizeSnapshot),
  };
}

function normalizeSnapshot(snapshot) {
  return {
    id: snapshot.id,
    tracked_hashtag_id: snapshot.tracked_hashtag_id,
    captured_at: snapshot.captured_at,
    provider: snapshot.provider,
    source_url: snapshot.source_url,
    sample_size: Number(snapshot.sample_size || 0),
    media_count: Number(snapshot.media_count || snapshot.sample_size || 0),
    total_likes: Number(snapshot.total_likes || 0),
    total_comments: Number(snapshot.total_comments || 0),
    total_video_views: Number(snapshot.total_video_views || 0),
    total_engagement: Number(snapshot.total_engagement || 0),
    avg_engagement: Number(snapshot.avg_engagement || 0),
    momentum_score: Number(snapshot.momentum_score || 0),
    top_media: Array.isArray(snapshot.top_media_json) ? snapshot.top_media_json : [],
    raw_payload_json: snapshot.raw_payload_json || {},
    warnings: snapshot.warnings || [],
  };
}

function groupSnapshots(snapshots) {
  const map = new Map();
  for (const snapshot of snapshots || []) {
    const list = map.get(snapshot.tracked_hashtag_id) || [];
    list.push(snapshot);
    map.set(snapshot.tracked_hashtag_id, list.slice(-12));
  }
  return map;
}

function defaultSuggestions() {
  return ["hikinglebanon", "lebanontrails", "hiking", "outdoorlebanon", "ecotourismlebanon"];
}

async function fetchHashtagMediaWithProvider({ tag, limit }) {
  const mode = env.HASHTAG_PROVIDER || "auto";
  if (mode === "meta") {
    return metaHashtagAdapter.fetchHashtagMedia({ tag, limit });
  }
  if (mode === "apify") {
    return apifyHashtagAdapter.fetchHashtagMedia({ tag, limit });
  }

  if (metaHashtagAdapter.isConfigured()) {
    const meta = await metaHashtagAdapter.fetchHashtagMedia({ tag, limit });
    const hasUsableMeta = (meta.media || []).length > 0;
    if (hasUsableMeta) return meta;
    const apify = await apifyHashtagAdapter.fetchHashtagMedia({ tag, limit });
    return {
      ...apify,
      warnings: [...(meta.warnings || []), "meta_hashtag_fallback_to_apify", ...(apify.warnings || [])],
    };
  }

  const apify = await apifyHashtagAdapter.fetchHashtagMedia({ tag, limit });
  return {
    ...apify,
    warnings: [...providerWarnings(), ...(apify.warnings || [])],
  };
}

function providerStatus() {
  const mode = env.HASHTAG_PROVIDER || "auto";
  const metaReady = metaHashtagAdapter.isConfigured();
  const apifyReady = Boolean(env.APIFY_API_TOKEN);
  const selected =
    mode === "meta" ? "meta_graph" : mode === "apify" ? "apify" : metaReady ? "meta_graph" : "apify";
  return {
    mode,
    selected,
    meta_ready: metaReady,
    apify_ready: apifyReady,
    message: metaReady
      ? "Meta Graph hashtag search is configured."
      : "Meta Graph hashtag search needs META_HASHTAG_ACCESS_TOKEN and META_HASHTAG_IG_USER_ID; Apify fallback remains available.",
  };
}

function providerWarnings() {
  const warnings = [];
  if (!metaHashtagAdapter.isConfigured()) {
    warnings.push("meta_hashtag_skipped:missing_META_HASHTAG_ACCESS_TOKEN_or_META_HASHTAG_IG_USER_ID");
  }
  if (!env.APIFY_API_TOKEN) {
    warnings.push("apify_hashtag_skipped:missing_api_token");
  }
  return warnings;
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function schemaAwareError(error) {
  const message = String(error?.message || "");
  if (message.includes("tracked_hashtags") || message.includes("hashtag_snapshots")) {
    const err = new Error(
      "Hashtag trend schema is not applied. Run backend/db/schema_v16.sql in Supabase.",
    );
    err.status = 503;
    return err;
  }
  return error;
}

module.exports = {
  listTrackedHashtags,
  searchHashtags,
  createTrackedHashtag,
  deleteTrackedHashtag,
  getHashtagSnapshots,
  refreshHashtag,
  refreshDueHashtags,
};
