const db = require("../dbService");
const { getSupabase } = require("../../config/supabase");

function isMissingTrendSchema(error) {
  return /trend_(runs|evidence|topics|insights|recommendations)|relation .* does not exist/i.test(
    `${error?.message || ""} ${error?.details?.original || ""}`,
  );
}

async function createRun({ workspaceId, brandId, scope, warnings }) {
  try {
    return await db.insert("trend_runs", {
      workspace_id: workspaceId,
      brand_id: brandId || null,
      run_scope: scope,
      run_status: "running",
    });
  } catch (err) {
    if (isMissingTrendSchema(err)) {
      warnings.push("trend_schema_missing:apply backend/db/schema_v12.sql to persist runs");
      return {
        id: `memory-${scope}-${Date.now()}`,
        workspace_id: workspaceId,
        brand_id: brandId || null,
        run_scope: scope,
        run_status: "running",
        persistence_disabled: true,
      };
    }
    throw err;
  }
}

async function updateRunStatus(run, status, warnings) {
  if (!run || run.persistence_disabled) return run;
  try {
    return await db.update("trend_runs", run.id, { run_status: status });
  } catch (err) {
    warnings.push(`trend_run_status_update_failed:${err.message}`);
    return run;
  }
}

async function persistEvidence(run, evidence, warnings) {
  if (!evidence.length || run.persistence_disabled) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = evidence.map((item) => ({
    trend_run_id: run.id,
    source: item.source,
    platform: item.platform,
    title: item.title,
    caption: item.caption,
    url: item.url,
    author: item.author,
    published_at: item.published_at,
    metrics_json: item.metrics || {},
    hashtags: item.hashtags || [],
    media_type: item.media_type,
    location_hint: item.location_hint,
    raw_payload_json: item.raw_payload || {},
    embedding_json: item.embedding || [],
  }));
  const { data, error } = await supabase.from("trend_evidence").insert(rows).select();
  if (error) {
    warnings.push(`trend_evidence_persist_failed:${error.message}`);
    return [];
  }
  return data || [];
}

async function persistTopics(run, topics, warnings) {
  if (!topics.length || run.persistence_disabled) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = topics.map((topic) => ({
    trend_run_id: run.id,
    topic_name: topic.topic_name,
    topic_keywords: topic.topic_keywords || [],
    trend_score: topic.trend_score || 0,
    scope: topic.scope,
    evidence_count: topic.evidence_count || 0,
  }));
  const { data, error } = await supabase.from("trend_topics").insert(rows).select();
  if (error) {
    warnings.push(`trend_topics_persist_failed:${error.message}`);
    return [];
  }
  return data || [];
}

async function persistInsights(run, insights, warnings) {
  if (!insights.length || run.persistence_disabled) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = insights.map((insight) => ({
    trend_run_id: run.id,
    insight_text: insight.insight_text,
    confidence_score: insight.confidence_score,
    supporting_evidence_count: insight.supporting_evidence_count || 0,
  }));
  const { data, error } = await supabase.from("trend_insights").insert(rows).select();
  if (error) {
    warnings.push(`trend_insights_persist_failed:${error.message}`);
    return [];
  }
  return data || [];
}

async function persistRecommendations(run, recommendations, warnings) {
  if (!recommendations.length || run.persistence_disabled) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = recommendations.map((rec) => ({
    trend_run_id: run.id,
    recommendation_text: rec.recommendation_text,
    recommendation_type: rec.recommendation_type,
    priority_score: rec.priority_score || 0,
  }));
  const { data, error } = await supabase.from("trend_recommendations").insert(rows).select();
  if (error) {
    warnings.push(`trend_recommendations_persist_failed:${error.message}`);
    return [];
  }
  return data || [];
}

module.exports = {
  createRun,
  persistEvidence,
  persistInsights,
  persistRecommendations,
  persistTopics,
  updateRunStatus,
};
