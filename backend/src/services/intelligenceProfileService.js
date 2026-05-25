const analyticsService = require("./analyticsService");
const workspaceService = require("./workspaceService");
const competitorService = require("./competitors/competitorService");
const hashtagTrendService = require("./hashtags/hashtagTrendService");

const DRIVER_WEIGHTS = {
  brandHealth: [
    ["Audience Mood", "audienceMood", 0.3],
    ["Engagement Performance", "engagementPerformance", 0.25],
    ["Predicted ROI", "predictedRoi", 0.2],
    ["Posting Consistency", "postingConsistency", 0.15],
    ["Competitive Position", "competitivePosition", 0.1],
  ],
  campaignReadiness: [
    ["Sentiment", "sentiment", 0.3],
    ["Predicted ROI", "predictedRoi", 0.25],
    ["Content Quality", "contentQuality", 0.2],
    ["Trend Alignment", "trendAlignment", 0.15],
    ["Timing Fit", "timingPlatformFit", 0.1],
  ],
  marketMomentum: [
    ["Trend Activity", "trendActivity", 0.35],
    ["Competitor Activity", "competitorActivity", 0.25],
    ["Recency", "recency", 0.2],
    ["Source Diversity", "sourceDiversity", 0.1],
    ["Seasonal Relevance", "seasonalRelevance", 0.1],
  ],
};

async function getIntelligenceProfile(workspaceId) {
  const [
    overviewResult,
    timeseriesResult,
    sentimentResult,
    topPostsResult,
    competitorResult,
    competitorSummaryResult,
    hashtagResult,
    profileResult,
  ] = await Promise.all([
    safe(() => analyticsService.getOverview(workspaceId)),
    safe(() =>
      analyticsService.getTimeseries(workspaceId, {
        metric: "engagement",
        groupBy: "day",
      }),
    ),
    safe(() => analyticsService.getSentimentBreakdown(workspaceId)),
    safe(() =>
      analyticsService.getTopPosts(workspaceId, {
        limit: 20,
        sortBy: "engagement",
      }),
    ),
    safe(() => competitorService.comparison(workspaceId, { window_days: 30 })),
    safe(() => competitorService.summary(workspaceId)),
    safe(() => hashtagTrendService.listTrackedHashtags(workspaceId)),
    safe(() => workspaceService.getBusinessProfile(workspaceId)),
  ]);

  const context = {
    overview: overviewResult.value,
    timeseries: timeseriesResult.value,
    sentiment: sentimentResult.value,
    topPosts: topPostsResult.value || [],
    competitors: competitorResult.value,
    competitorSummary: competitorSummaryResult.value,
    hashtags: hashtagResult.value,
    profile: profileResult.value,
  };

  const components = buildComponentScores(context);

  return {
    workspaceId,
    generatedAt: new Date().toISOString(),
    scores: {
      brandHealth: buildScore("brandHealth", components, {
        strong: "Your brand signal is healthy across audience mood, engagement, and campaign return.",
        steady: "Your brand has usable momentum, with a few signals that need attention before scaling.",
        weak: "Your brand profile needs stronger data and more consistent engagement before major campaign decisions.",
      }),
      campaignReadiness: buildScore("campaignReadiness", components, {
        strong: "Recent campaign evidence suggests the next post can move forward with confidence.",
        steady: "The campaign signal is workable, but one or two drivers should be improved before publishing.",
        weak: "The campaign is not ready yet because the current evidence is thin or mixed.",
      }),
      marketMomentum: buildScore("marketMomentum", components, {
        strong: "The market is active enough to support a timely content move.",
        steady: "Market momentum is visible but still depends on a narrow set of signals.",
        weak: "The market signal is too thin right now, so refresh sources before committing to a trend-led move.",
      }),
    },
  };
}

function buildComponentScores(ctx) {
  const overview = ctx.overview || {};
  const averages = overview.averages || {};
  const totals = overview.totals || {};
  const points = ctx.timeseries?.points || [];
  const topPosts = Array.isArray(ctx.topPosts) ? ctx.topPosts : [];
  const hashtags = ctx.hashtags?.hashtags || [];
  const competitorSummary = ctx.competitorSummary || {};
  const competitorBenchmark = ctx.competitors?.benchmark || {};

  const posts30 = sum(points.slice(-30).map((p) => p.samples || 0));
  const latestPostDays = latestBucketAgeDays(points);
  const latestSnapshots = hashtags.map((h) => h.latest_snapshot).filter(Boolean);
  const avgMomentum =
    latestSnapshots.length > 0
      ? average(latestSnapshots.map((s) => Number(s.momentum_score || 0)))
      : null;
  const hashtagSampleSize = sum(
    latestSnapshots.map((s) => Number(s.sample_size || 0)),
  );
  const competitorEvidence =
    competitorBenchmark.evidence_coverage ||
    ctx.competitors?.benchmark?.evidence_coverage ||
    {};

  return {
    audienceMood:
      averages.sentimentScore == null
        ? unavailable("No sentiment baseline is available yet.")
        : available(scoreFromSentiment(averages.sentimentScore)),
    engagementPerformance:
      averages.engagementRate == null
        ? unavailable("No engagement-rate snapshots are available yet.")
        : available(scoreFromEngagementRate(averages.engagementRate)),
    predictedRoi:
      averages.predictedRoi == null
        ? unavailable("No ROI predictions have been generated yet.")
        : available(scoreFromRoi(averages.predictedRoi)),
    postingConsistency:
      totals.syncedPosts > 0
        ? available(scoreFromPosting(posts30))
        : unavailable("No synced posts are available for cadence scoring."),
    competitivePosition:
      (competitorSummary.approved_count || 0) > 0
        ? available(scoreFromCompetitivePosition(competitorBenchmark))
        : unavailable("No approved competitors are tracked yet."),
    sentiment:
      ctx.sentiment?.total > 0
        ? available(scoreFromSentimentBreakdown(ctx.sentiment))
        : unavailable("No analyzed captions or comments are available yet."),
    contentQuality:
      topPosts.length > 0
        ? available(scoreFromTopPosts(topPosts))
        : unavailable("No recent posts are available for content scoring."),
    trendAlignment:
      latestSnapshots.length > 0
        ? available(scoreFromTrendSignals(avgMomentum, hashtagSampleSize))
        : unavailable("No tracked hashtag snapshots are available yet."),
    timingPlatformFit:
      totals.syncedPosts > 0
        ? available(scoreFromTimingFit(posts30, totals.connectedAccounts || 0))
        : unavailable("Sync posts before timing fit can be scored."),
    trendActivity:
      latestSnapshots.length > 0
        ? available(scoreFromTrendSignals(avgMomentum, hashtagSampleSize))
        : unavailable("No local or global trend snapshots are available yet."),
    competitorActivity:
      (competitorSummary.approved_count || 0) > 0
        ? available(
            scoreFromCompetitorActivity({
              approved: competitorSummary.approved_count || 0,
              withPosts: competitorEvidence.competitors_with_posts || 0,
              publicEvidence: competitorEvidence.public_evidence_items || 0,
            }),
          )
        : unavailable("No approved competitors are tracked yet."),
    recency:
      latestPostDays == null
        ? unavailable("No dated post evidence is available yet.")
        : available(scoreFromRecency(latestPostDays)),
    sourceDiversity: available(
      scoreFromSourceDiversity({
        connectedAccounts: totals.connectedAccounts || 0,
        hashtags: latestSnapshots.length,
        competitors: competitorSummary.approved_count || 0,
        sentimentRows: ctx.sentiment?.total || 0,
      }),
    ),
    seasonalRelevance: available(scoreFromSeason(ctx.profile)),
  };
}

function buildScore(key, components, copy) {
  const drivers = DRIVER_WEIGHTS[key].map(([label, componentKey, weight]) =>
    buildDriver(label, components[componentKey], weight),
  );
  const score = Math.round(
    drivers.reduce(
      (total, driver) => total + driver.componentScore * driver.weight,
      0,
    ),
  );
  const missingCount = drivers.filter((driver) => driver.unavailableReason).length;
  const confidence = round(clamp(0.92 - missingCount * 0.12, 0.35, 0.95), 2);
  const status = statusFor(score);
  const weakest = drivers
    .filter((driver) => driver.direction === "negative")
    .sort((a, b) => a.impact - b.impact)[0];
  const strongest = drivers
    .filter((driver) => driver.direction === "positive")
    .sort((a, b) => b.impact - a.impact)[0];

  return {
    score,
    status,
    confidence,
    explanation:
      score >= 80 ? copy.strong : score >= 60 ? copy.steady : copy.weak,
    suggestedNextMove: nextMoveFor(key, weakest, strongest, missingCount),
    microDrivers: drivers,
  };
}

function buildDriver(label, component, weight) {
  const componentScore =
    component?.score == null ? 50 : Math.round(clamp(component.score, 0, 100));
  const impact = round(
    clamp(((componentScore - 50) / 50) * weight * 4, -1, 1),
    1,
  );
  return {
    label,
    componentScore,
    weight,
    impact,
    direction:
      impact > 0.05 ? "positive" : impact < -0.05 ? "negative" : "neutral",
    ...(component?.unavailableReason
      ? { unavailableReason: component.unavailableReason }
      : {}),
  };
}

function nextMoveFor(key, weakest, strongest, missingCount) {
  if (missingCount >= 3) {
    return "Refresh sources first so the score is based on enough real evidence.";
  }
  if (weakest) {
    const map = {
      brandHealth: `Fix the weakest brand driver first: ${weakest.label.toLowerCase()}.`,
      campaignReadiness: `Improve ${weakest.label.toLowerCase()} before publishing the next campaign.`,
      marketMomentum: `Refresh or expand ${weakest.label.toLowerCase()} before acting on a trend.`,
    };
    return map[key];
  }
  if (strongest) {
    const map = {
      brandHealth: `Lean into the strongest driver: ${strongest.label.toLowerCase()}.`,
      campaignReadiness: `Use the strongest signal, ${strongest.label.toLowerCase()}, to publish a tighter campaign test.`,
      marketMomentum: `Build the next content angle around ${strongest.label.toLowerCase()}.`,
    };
    return map[key];
  }
  return "Keep collecting evidence and review the score again after the next sync.";
}

function statusFor(score) {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Steady";
  if (score >= 50) return "Needs Focus";
  return "At Risk";
}

function available(score) {
  return { score };
}

function unavailable(unavailableReason) {
  return { score: 50, unavailableReason };
}

function scoreFromSentiment(value) {
  return clamp(50 + Number(value || 0) * 50, 0, 100);
}

function scoreFromSentimentBreakdown(breakdown) {
  return clamp(50 + (breakdown.shares.positive - breakdown.shares.negative) * 60, 0, 100);
}

function scoreFromEngagementRate(value) {
  const percent = Number(value) <= 1 ? Number(value) * 100 : Number(value);
  return clamp((percent / 8) * 100, 20, 100);
}

function scoreFromRoi(value) {
  return clamp(35 + Number(value || 0) * 25, 0, 100);
}

function scoreFromPosting(posts30) {
  if (posts30 <= 0) return 25;
  return clamp(30 + Math.min(posts30, 12) * 6, 25, 100);
}

function scoreFromCompetitivePosition(benchmark = {}) {
  if (!benchmark || benchmark.data_quality_label === "thin") return 55;
  const base =
    benchmark.engagement_winner === "you"
      ? 78
      : benchmark.engagement_winner === "competitors"
        ? 42
        : 58;
  const quality = Number(benchmark.data_quality_score || 55);
  return clamp(base * 0.75 + quality * 0.25, 0, 100);
}

function scoreFromTopPosts(posts) {
  const top = posts.slice(0, 5);
  const avgEngagement = average(top.map((post) => Number(post.engagement || 0)));
  return clamp(35 + (avgEngagement / 100) * 65, 25, 100);
}

function scoreFromTrendSignals(avgMomentum, sampleSize) {
  const momentum = avgMomentum == null ? 0 : Number(avgMomentum);
  return clamp(45 + momentum * 0.45 + Math.min(sampleSize, 60) * 0.4, 20, 100);
}

function scoreFromTimingFit(posts30, connectedAccounts) {
  const cadenceScore = scoreFromPosting(posts30);
  const sourceScore = connectedAccounts > 0 ? 70 : 45;
  return clamp(cadenceScore * 0.7 + sourceScore * 0.3, 0, 100);
}

function scoreFromCompetitorActivity({ approved, withPosts, publicEvidence }) {
  return clamp(35 + approved * 5 + withPosts * 15 + Math.min(publicEvidence, 20) * 1.5, 30, 100);
}

function scoreFromRecency(days) {
  if (days <= 3) return 95;
  if (days <= 7) return 82;
  if (days <= 14) return 65;
  if (days <= 30) return 45;
  return 25;
}

function scoreFromSourceDiversity({ connectedAccounts, hashtags, competitors, sentimentRows }) {
  const buckets = [
    connectedAccounts > 0,
    hashtags > 0,
    competitors > 0,
    sentimentRows > 0,
  ].filter(Boolean).length;
  return clamp(25 + buckets * 18.75, 25, 100);
}

function scoreFromSeason(profile) {
  const month = new Date().getMonth() + 1;
  const category = String(profile?.category || profile?.business_type || "").toLowerCase();
  const isOutdoor = /hiking|outdoor|travel|tour|eco/.test(category);
  if (!isOutdoor) return 62;
  const strongOutdoorMonths = new Set([3, 4, 5, 9, 10, 11]);
  return strongOutdoorMonths.has(month) ? 78 : 64;
}

function latestBucketAgeDays(points) {
  const dated = (points || [])
    .filter((point) => point.samples > 0 && point.bucket)
    .sort((a, b) => new Date(b.bucket) - new Date(a.bucket));
  if (!dated.length) return null;
  const latest = new Date(dated[0].bucket).getTime();
  if (!Number.isFinite(latest)) return null;
  return Math.max(0, (Date.now() - latest) / 86_400_000);
}

async function safe(fn) {
  try {
    return { value: await fn(), error: null };
  } catch (error) {
    return { value: null, error };
  }
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function average(values) {
  const clean = values.map(Number).filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return sum(clean) / clean.length;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

module.exports = {
  getIntelligenceProfile,
};
