const {
  clamp01,
  daysOld,
  engagementTotal,
} = require("./trendTextUtils");

function scoreTopics(clusters) {
  const maxAvgEngagement = Math.max(
    1,
    ...clusters.map((cluster) => Number(cluster.average_engagement || 0)),
  );
  const maxEvidenceCount = Math.max(1, ...clusters.map((cluster) => cluster.evidence_count || 0));

  return clusters.map((cluster) => {
    const engagementScore = clamp01((cluster.average_engagement || 0) / maxAvgEngagement);
    const recencyScore = averageRecencyScore(cluster.evidence);
    const sourceDiversityScore = clamp01(uniqueSources(cluster.evidence) / 3);
    const keywordFrequencyScore = clamp01((cluster.evidence_count || 0) / maxEvidenceCount);

    const score =
      0.4 * engagementScore +
      0.2 * recencyScore +
      0.2 * sourceDiversityScore +
      0.2 * keywordFrequencyScore;

    return {
      ...cluster,
      trend_score: Number((score * 100).toFixed(2)),
      score_breakdown: {
        engagement_score: Number(engagementScore.toFixed(3)),
        recency_score: Number(recencyScore.toFixed(3)),
        source_diversity_score: Number(sourceDiversityScore.toFixed(3)),
        keyword_frequency_score: Number(keywordFrequencyScore.toFixed(3)),
      },
      top_evidence: topEvidence(cluster.evidence),
    };
  }).sort((a, b) => b.trend_score - a.trend_score);
}

function averageRecencyScore(evidence = []) {
  if (!evidence.length) return 0;
  const scores = evidence.map((item) => {
    const d = daysOld(item.published_at);
    return clamp01(1 - d / 45);
  });
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function uniqueSources(evidence = []) {
  return new Set(
    evidence
      .map((item) => item.source)
      .filter(Boolean),
  ).size;
}

function topEvidence(evidence = []) {
  return evidence
    .slice()
    .sort((a, b) => engagementTotal(b.metrics) - engagementTotal(a.metrics))
    .slice(0, 3)
    .map((item) => ({
      source: item.source,
      platform: item.platform,
      title: item.title,
      caption: item.caption,
      url: item.url,
      author: item.author,
      published_at: item.published_at,
      engagement_total: engagementTotal(item.metrics),
      media_type: item.media_type,
    }));
}

module.exports = {
  scoreTopics,
};
