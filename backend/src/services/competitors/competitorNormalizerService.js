const {
  isValidHandle,
  normalizeHandle,
  profileUrlFor,
} = require("./competitorTextUtils");
const scoring = require("./competitorScoringService");

function normalizeCandidate(candidate, context = {}) {
  const platform = candidate.platform || context.platform || "meta_instagram";
  const handle = normalizeHandle(candidate.handle);
  if (!isValidHandle(handle, platform)) return null;

  const scored = scoring.scoreCandidate(candidate, context);
  return {
    platform,
    handle,
    display_name: candidate.display_name || handle,
    profile_url: candidate.profile_url || profileUrlFor(platform, handle),
    avatar_url: candidate.avatar_url || null,
    region: candidate.region || context.location || null,
    industry: candidate.industry || context.category || null,
    tags: [...new Set((candidate.tags || []).map((tag) => String(tag).replace(/^#/, "").toLowerCase()))]
      .filter(Boolean)
      .slice(0, 20),
    source: candidate.source || "web_search",
    relevance_score: scored.relevance_score,
    confidence: scored.confidence,
    rationale: scored.rationale,
    signals: scored.signals,
    evidence_json: candidate.evidence || [],
    raw_payload_json: {
      metrics: candidate.metrics || {},
      score_breakdown: scored.score_breakdown,
      raw_payload: candidate.raw_payload || {},
    },
  };
}

function normalizeCandidates(candidates, context = {}) {
  return (candidates || [])
    .map((candidate) => normalizeCandidate(candidate, context))
    .filter(Boolean)
    .sort((a, b) => b.relevance_score - a.relevance_score);
}

module.exports = {
  normalizeCandidate,
  normalizeCandidates,
};
