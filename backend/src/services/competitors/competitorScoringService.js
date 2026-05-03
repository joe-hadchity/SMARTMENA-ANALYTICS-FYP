const { keywordTokens } = require("./competitorTextUtils");

function scoreCandidate(candidate, context = {}) {
  const text = [
    candidate.handle,
    candidate.display_name,
    candidate.industry,
    candidate.region,
    ...(candidate.tags || []),
    ...(candidate.evidence || []).map((item) => `${item.title || ""} ${item.snippet || ""}`),
  ].join(" ").toLowerCase();

  const nicheTerms = keywordTokens(context.category, context.keywords || [], context.hashtags || []);
  const locationTerms = keywordTokens(context.location);
  const nicheHits = nicheTerms.filter((term) => text.includes(term.toLowerCase()));
  const locationHits = locationTerms.filter((term) => text.includes(term.toLowerCase()));
  const isProfile = /instagram\.com\/[a-z0-9._-]+\/?$/i.test(candidate.profile_url || "");
  const evidenceCount = candidate.evidence?.length || 0;
  const hasFollowerSignal = Number(candidate.metrics?.followers_count || 0) > 0;

  const nicheMatch = clamp01(nicheHits.length / Math.max(3, nicheTerms.length || 3));
  const locationMatch = locationTerms.length ? clamp01(locationHits.length / locationTerms.length) : 0.4;
  const profileConfidence = isProfile ? 1 : 0.25;
  const sourceQuality = candidate.source === "brave_search" ? 0.85 : 0.65;
  const evidenceStrength = clamp01(evidenceCount / 3 + (hasFollowerSignal ? 0.15 : 0));

  const score =
    0.35 * nicheMatch +
    0.25 * locationMatch +
    0.15 * profileConfidence +
    0.15 * evidenceStrength +
    0.1 * sourceQuality;

  const signals = [];
  if (nicheHits.length) signals.push(`Matched niche terms: ${nicheHits.slice(0, 5).join(", ")}`);
  if (locationHits.length) signals.push(`Matched location: ${locationHits.slice(0, 3).join(", ")}`);
  if (isProfile) signals.push("Resolved to a public social profile URL");
  if (evidenceCount) signals.push(`${evidenceCount} public search evidence item${evidenceCount === 1 ? "" : "s"}`);
  if (hasFollowerSignal) signals.push(`Follower signal found: ${candidate.metrics.followers_count}`);

  return {
    relevance_score: Number((score * 100).toFixed(3)),
    confidence: Number(Math.min(0.98, 0.2 + score * 0.75).toFixed(4)),
    signals,
    rationale:
      signals.length > 0
        ? signals.slice(0, 3).join(". ")
        : "Candidate has limited public evidence for this workspace context.",
    score_breakdown: {
      niche_match: Number(nicheMatch.toFixed(3)),
      location_match: Number(locationMatch.toFixed(3)),
      profile_confidence: Number(profileConfidence.toFixed(3)),
      evidence_strength: Number(evidenceStrength.toFixed(3)),
      source_quality: Number(sourceQuality.toFixed(3)),
    },
  };
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

module.exports = {
  scoreCandidate,
};
