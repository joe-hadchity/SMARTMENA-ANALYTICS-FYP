const trendContextService = require("./trendContextService");
const trendNormalizerService = require("./trendNormalizerService");
const trendEmbeddingService = require("./trendEmbeddingService");
const trendClusteringService = require("./trendClusteringService");
const trendScoringService = require("./trendScoringService");
const trendExplanationService = require("./trendExplanationService");
const trendRecommendationService = require("./trendRecommendationService");
const persistence = require("./trendPersistenceService");

const ownPostsAdapter = require("./trendSourceAdapters/ownPostsAdapter");
const braveSearchAdapter = require("./trendSourceAdapters/braveSearchAdapter");
const youtubeAdapter = require("./trendSourceAdapters/youtubeAdapter");

async function buildDashboard({ workspaceId, brandId = null, scope = "all", limit = 80 } = {}) {
  const started = Date.now();
  const context = await trendContextService.buildContext(workspaceId, brandId);
  const warnings = [...(context.warnings || [])];
  const scopes = scope === "micro" || scope === "macro" ? [scope] : ["micro", "macro"];
  const runs = [];
  const allEvidence = [];
  const allTopics = [];
  const allInsights = [];
  const allRecommendations = [];

  for (const runScope of scopes) {
    const result = await runScopePipeline({
      workspaceId,
      brandId,
      context,
      scope: runScope,
      limit,
      warnings,
    });
    runs.push(result.run);
    allEvidence.push(...result.evidence);
    allTopics.push(...result.topics);
    allInsights.push(...result.insights);
    allRecommendations.push(...result.recommendations);
  }

  return {
    workspace_id: workspaceId,
    brand_id: brandId,
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - started,
    context: stripInternalContext(context),
    runs,
    source_summary: summarizeSources(allEvidence),
    local_trends: allTopics.filter((topic) => topic.scope === "micro"),
    global_trends: allTopics.filter((topic) => topic.scope === "macro"),
    format_trends: summarizeFormatTrends(allEvidence),
    caption_trends: summarizeCaptionTrends(allEvidence),
    campaign_theme_trends: summarizeCampaignThemes(allTopics),
    insights: allInsights,
    recommendations: allRecommendations
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 12),
    warnings: [...new Set(warnings)],
  };
}

async function runScopePipeline({ workspaceId, brandId, context, scope, limit, warnings }) {
  const run = await persistence.createRun({ workspaceId, brandId, scope, warnings });
  try {
    const adapterResults = await collectSources({ workspaceId, context, scope, limit });
    for (const result of adapterResults) warnings.push(...(result.warnings || []));

    const rawEvidence = adapterResults.flatMap((result) => result.evidence || []);
    const normalized = trendNormalizerService.normalize(rawEvidence, context);
    const embedded = await trendEmbeddingService.embedEvidence(normalized);
    const clusters = trendClusteringService.clusterTopics(embedded, context);
    const scoredTopics = trendScoringService.scoreTopics(clusters).slice(0, 12);
    const insights = trendExplanationService.generateInsights(scoredTopics, embedded, context);
    const recommendations = trendRecommendationService.generateActions(
      scoredTopics,
      insights,
      context,
    );

    await persistence.persistEvidence(run, embedded, warnings);
    await persistence.persistTopics(run, scoredTopics, warnings);
    await persistence.persistInsights(run, insights, warnings);
    await persistence.persistRecommendations(run, recommendations, warnings);
    await persistence.updateRunStatus(run, "succeeded", warnings);

    return {
      run: publicRun(run, "succeeded", embedded.length),
      evidence: embedded,
      topics: publicTopics(scoredTopics),
      insights,
      recommendations,
    };
  } catch (err) {
    await persistence.updateRunStatus(run, "failed", warnings);
    throw err;
  }
}

async function collectSources({ workspaceId, context, scope, limit }) {
  if (scope === "micro") {
    return Promise.all([
      ownPostsAdapter.collect({ workspaceId, context, limit }),
      braveSearchAdapter.collect({ workspaceId, context, scope, limit }),
    ]);
  }
  return Promise.all([
    braveSearchAdapter.collect({ workspaceId, context, scope, limit }),
    youtubeAdapter.collect({ workspaceId, context, scope, limit }),
  ]);
}

function publicRun(run, status, evidenceCount) {
  return {
    id: run.id,
    scope: run.run_scope,
    status,
    evidence_count: evidenceCount,
    persistence_disabled: Boolean(run.persistence_disabled),
  };
}

function publicTopics(topics) {
  return topics.map((topic) => ({
    topic_name: topic.topic_name,
    topic_keywords: topic.topic_keywords,
    trend_score: topic.trend_score,
    scope: topic.scope,
    evidence_count: topic.evidence_count,
    score_breakdown: topic.score_breakdown,
    format_counts: topic.format_counts,
    source_counts: topic.source_counts,
    caption_pattern_counts: topic.caption_pattern_counts,
    average_engagement: topic.average_engagement,
    top_evidence: topic.top_evidence,
  }));
}

function summarizeSources(evidence) {
  const out = {};
  for (const item of evidence || []) {
    out[item.source] = (out[item.source] || 0) + 1;
  }
  return out;
}

function summarizeFormatTrends(evidence) {
  const grouped = groupEvidence(evidence, (item) => item.media_type || "unknown");
  return Object.entries(grouped)
    .map(([format, items]) => ({
      format,
      evidence_count: items.length,
      average_engagement: average(items.map((item) => item.metrics?.engagement_total || 0)),
      sources: summarizeSources(items),
    }))
    .sort((a, b) => b.average_engagement - a.average_engagement || b.evidence_count - a.evidence_count);
}

function summarizeCaptionTrends(evidence) {
  const grouped = groupEvidence(evidence, (item) => item.caption_pattern || "unknown");
  return Object.entries(grouped)
    .map(([pattern, items]) => ({
      pattern,
      evidence_count: items.length,
      average_engagement: average(items.map((item) => item.metrics?.engagement_total || 0)),
      example: items.find((item) => item.caption)?.caption || items[0]?.title || null,
    }))
    .sort((a, b) => b.evidence_count - a.evidence_count);
}

function summarizeCampaignThemes(topics) {
  return (topics || [])
    .filter((topic) =>
      /group|eco|beginner|sunset|waterfall|campaign|community|season|trail/i.test(topic.topic_name),
    )
    .slice(0, 8)
    .map((topic) => ({
      theme: topic.topic_name,
      scope: topic.scope,
      trend_score: topic.trend_score,
      evidence_count: topic.evidence_count,
      suggested_angle: campaignAngle(topic.topic_name),
    }));
}

function campaignAngle(topicName) {
  if (/group/i.test(topicName)) return "community participation";
  if (/eco/i.test(topicName)) return "sustainable outdoor impact";
  if (/beginner/i.test(topicName)) return "accessible weekend adventure";
  if (/sunset/i.test(topicName)) return "limited-time scenic experience";
  if (/waterfall/i.test(topicName)) return "save-worthy destination guide";
  return "focused niche campaign";
}

function groupEvidence(evidence, keyFn) {
  const out = {};
  for (const item of evidence || []) {
    const key = keyFn(item);
    out[key] = out[key] || [];
    out[key].push(item);
  }
  return out;
}

function average(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return 0;
  return Number((nums.reduce((sum, n) => sum + n, 0) / nums.length).toFixed(2));
}

function stripInternalContext(context) {
  const { warnings, ...publicContext } = context || {};
  return publicContext;
}

module.exports = {
  buildDashboard,
};
