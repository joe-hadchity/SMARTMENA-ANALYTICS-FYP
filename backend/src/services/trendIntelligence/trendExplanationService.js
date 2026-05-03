function generateInsights(topics, evidence, context = {}) {
  const insights = [];
  const selected = (topics || []).slice(0, 8);

  for (const topic of selected) {
    const formatPattern = dominantKey(topic.format_counts) || "mixed formats";
    const captionPattern = dominantKey(topic.caption_pattern_counts) || "mixed caption styles";
    const engagementReason = engagementReasonFor(topic, formatPattern, captionPattern, context);
    const scopeText = topic.scope === "micro" ? "locally" : "globally";
    const evidenceCount = topic.evidence_count || 0;

    insights.push({
      insight_text:
        `${topic.topic_name} is gaining signal ${scopeText} because ${evidenceCount} collected evidence item` +
        `${evidenceCount === 1 ? "" : "s"} show ${formatLabel(formatPattern)} paired with ` +
        `${captionLabel(captionPattern)}. ${engagementReason}`,
      confidence_score: confidenceFor(topic),
      supporting_evidence_count: evidenceCount,
      topic_name: topic.topic_name,
      scope: topic.scope,
      evidence_count: evidenceCount,
      format_pattern: formatPattern,
      caption_pattern: captionPattern,
      engagement_reason: engagementReason,
      supporting_sources: topic.source_counts,
    });
  }

  if (!insights.length && evidence?.length) {
    insights.push({
      insight_text:
        "The system collected evidence, but no strong recurring trend cluster reached the minimum signal threshold yet.",
      confidence_score: 0.45,
      supporting_evidence_count: evidence.length,
      topic_name: "early signals",
      scope: "micro",
      evidence_count: evidence.length,
      format_pattern: "mixed",
      caption_pattern: "mixed",
      engagement_reason: "Evidence is too scattered to explain one dominant trend.",
      supporting_sources: {},
    });
  }

  return insights;
}

function engagementReasonFor(topic, formatPattern, captionPattern, context) {
  if (captionPattern === "emotional_storytelling") {
    return "The repeated emotional storytelling pattern points to audience interest in identity, escape, memory, and community rather than only trail facts.";
  }
  if (captionPattern === "cta_driven") {
    return "The repeated call-to-action pattern suggests posts are pushing viewers toward comments, saves, DMs, or signups.";
  }
  if (formatPattern === "video" || formatPattern === "reel") {
    return "Video-led evidence is stronger than static evidence, which usually means movement, scenery, and participation are carrying the engagement.";
  }
  if (/waterfall|sunset|trail|eco/i.test(topic.topic_name)) {
    return "The theme appears repeatedly in recent source material, making it a concrete content angle rather than a generic category.";
  }
  return "The signal comes from repeated mentions across sources plus recent activity in the collected evidence.";
}

function confidenceFor(topic) {
  const countScore = Math.min(0.35, (topic.evidence_count || 0) * 0.05);
  const sourceScore = Math.min(0.25, Object.keys(topic.source_counts || {}).length * 0.08);
  const scoreScore = Math.min(0.25, Number(topic.trend_score || 0) / 400);
  return Number(Math.min(0.95, 0.25 + countScore + sourceScore + scoreScore).toFixed(4));
}

function dominantKey(counts = {}) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function formatLabel(value) {
  const labels = {
    reel: "short-form reel content",
    video: "video content",
    carousel: "carousel explainers",
    image: "static image posts",
    text: "text-heavy posts",
  };
  return labels[value] || value || "mixed formats";
}

function captionLabel(value) {
  const labels = {
    emotional_storytelling: "emotional storytelling captions",
    cta_driven: "direct call-to-action captions",
    informational_guide: "guide-style captions",
    location_first: "location-first captions",
    short_hook: "short hook captions",
    descriptive_caption: "descriptive captions",
  };
  return labels[value] || value || "mixed caption styles";
}

module.exports = {
  generateInsights,
};
