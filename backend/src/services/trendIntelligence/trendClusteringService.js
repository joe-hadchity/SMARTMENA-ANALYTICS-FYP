const {
  averageEmbedding,
  cosine,
} = require("./trendEmbeddingService");
const {
  engagementTotal,
  titleCase,
  topKeywords,
} = require("./trendTextUtils");

function clusterTopics(evidence, context = {}) {
  const seeded = new Map();

  for (const item of evidence || []) {
    const topicName = classifyTopic(item, context);
    if (!seeded.has(topicName)) {
      seeded.set(topicName, {
        topic_name: topicName,
        scope: item.scope,
        evidence: [],
      });
    }
    seeded.get(topicName).evidence.push(item);
  }

  const clusters = mergeSimilarClusters([...seeded.values()]);
  return clusters
    .map((cluster) => enrichCluster(cluster, context))
    .sort((a, b) => b.evidence_count - a.evidence_count);
}

function classifyTopic(item, context = {}) {
  const text = [
    item.title,
    item.caption,
    ...(item.keywords || []),
    ...(item.hashtags || []),
  ]
    .join(" ")
    .toLowerCase();
  const isHiking = /hiking|hike|trail|outdoor|adventure|eco|tourism/.test(
    `${text} ${context.category || ""}`,
  );

  if (isHiking) {
    if (/(group|community|friends|people|club|weekly|weekend|join)/.test(text)) {
      return "group hiking experiences";
    }
    if (/(waterfall|river|lake|swim)/.test(text)) return "waterfall hikes";
    if (/(sunset|sunrise|golden hour|dawn)/.test(text)) return "sunset trails";
    if (/(eco|clean.?up|sustainable|nature|environment)/.test(text)) {
      return "eco tourism cleanup hikes";
    }
    if (/(beginner|easy|family|kids|first.?time|guide)/.test(text)) {
      return "beginner friendly hikes";
    }
    if (/(gear|safety|winter|snow|tips|what to bring)/.test(text)) {
      return "hiking safety and gear";
    }
    if (/(reel|video|vlog|shorts|cinematic)/.test(text)) {
      return "outdoor video storytelling";
    }
    if (/(cedars|chouf|tannourine|qadisha|batroun|lebanon mountain)/.test(text)) {
      return "lebanon trail discovery";
    }
    return "hiking trip planning";
  }

  if (/(reel|video|vlog|shorts)/.test(text)) return "short form video storytelling";
  if (/(campaign|offer|launch|season|event)/.test(text)) return "campaign theme experiments";
  if (/(guide|tips|how to|best)/.test(text)) return "educational content";

  const keywords = topKeywords(text, [], 3);
  return keywords.length ? titleCase(keywords.join(" ")) : "general audience interest";
}

function mergeSimilarClusters(clusters) {
  const out = [];
  for (const cluster of clusters) {
    const embedding = averageEmbedding(cluster.evidence);
    const match = out.find((existing) => cosine(existing.embedding, embedding) >= 0.88);
    if (match && cluster.topic_name !== match.topic_name) {
      match.evidence.push(...cluster.evidence);
      match.aliases.push(cluster.topic_name);
      match.embedding = averageEmbedding(match.evidence);
    } else {
      out.push({
        ...cluster,
        aliases: [],
        embedding,
      });
    }
  }
  return out;
}

function enrichCluster(cluster, context) {
  const evidence = cluster.evidence || [];
  const text = evidence
    .map((item) => [item.title, item.caption, ...(item.keywords || [])].join(" "))
    .join(" ");
  const topicKeywords = topKeywords(text, context.keywords || [], 10);
  const format_counts = countBy(evidence, (item) => item.media_type || "unknown");
  const source_counts = countBy(evidence, (item) => item.source || "unknown");
  const caption_pattern_counts = countBy(evidence, (item) => item.caption_pattern || "unknown");
  const author_counts = countBy(evidence, (item) => item.author || "unknown");
  const engagementValues = evidence.map((item) => engagementTotal(item.metrics));
  const avgEngagement =
    engagementValues.reduce((sum, value) => sum + value, 0) /
    Math.max(1, engagementValues.length);

  return {
    topic_name: cluster.topic_name,
    topic_keywords: topicKeywords,
    scope: cluster.scope,
    evidence_count: evidence.length,
    evidence,
    embedding: cluster.embedding,
    aliases: cluster.aliases || [],
    format_counts,
    source_counts,
    caption_pattern_counts,
    author_counts,
    average_engagement: Number(avgEngagement.toFixed(2)),
  };
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items || []) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

module.exports = {
  clusterTopics,
  classifyTopic,
};
