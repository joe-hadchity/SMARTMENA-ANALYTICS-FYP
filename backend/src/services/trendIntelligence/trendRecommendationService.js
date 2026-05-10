function generateActions(topics, insights, context = {}) {
  const actions = [];
  const top = (topics || []).slice(0, 8);

  for (const topic of top) {
    const format = dominantKey(topic.format_counts) || "reel";
    const captionPattern = dominantKey(topic.caption_pattern_counts) || "short_hook";
    const priority = Number(Math.min(100, Math.max(20, topic.trend_score || 0)).toFixed(2));

    actions.push({
      recommendation_text: buildTopicAction(topic, format, captionPattern, context),
      recommendation_type: "content_theme",
      priority_score: priority,
      topic_name: topic.topic_name,
      scope: topic.scope,
    });

    if (format === "reel" || format === "video") {
      actions.push({
        recommendation_text: `Turn "${topic.topic_name}" into a short video sequence: opening scene, people/action shot, location reveal, then a clear join/save CTA.`,
        recommendation_type: "format",
        priority_score: Number((priority * 0.92).toFixed(2)),
        topic_name: topic.topic_name,
        scope: topic.scope,
      });
    }

    if (captionPattern !== "cta_driven") {
      actions.push({
        recommendation_text: `For "${topic.topic_name}", test captions with a one-line emotional hook, the trail/location, and one action such as save, comment, or DM to join.`,
        recommendation_type: "caption",
        priority_score: Number((priority * 0.85).toFixed(2)),
        topic_name: topic.topic_name,
        scope: topic.scope,
      });
    }
  }

  return dedupe(actions)
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 12);
}

function buildTopicAction(topic, format, captionPattern, context) {
  if (/group hiking/i.test(topic.topic_name)) {
    return `Post more ${context.location || "local"} group-hike ${format}s that show real participants, shared moments, and the weekend plan.`;
  }
  if (/waterfall/i.test(topic.topic_name)) {
    return "Increase waterfall hike content with route difficulty, safety notes, and a strong save-for-later CTA.";
  }
  if (/sunset/i.test(topic.topic_name)) {
    return "Package sunset trail content as short, cinematic posts with exact timing and meeting-point details.";
  }
  if (/eco/i.test(topic.topic_name)) {
    return "Frame eco-tourism hikes as community-impact campaigns, not only scenic trips.";
  }
  if (/beginner/i.test(topic.topic_name)) {
    return "Create beginner-friendly hike guides that answer difficulty, what to bring, and who the trip is for.";
  }
  if (/video|storytelling/i.test(topic.topic_name)) {
    return "Prioritize short-form outdoor storytelling over generic scenery: start with movement, then reveal the destination.";
  }
  return `Create a focused campaign around "${topic.topic_name}" using ${format} content and ${captionPattern.replace(/_/g, " ")}.`;
}

function dominantKey(counts = {}) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function dedupe(actions) {
  const seen = new Set();
  const out = [];
  for (const action of actions) {
    const key = action.recommendation_text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}

module.exports = {
  generateActions,
};
