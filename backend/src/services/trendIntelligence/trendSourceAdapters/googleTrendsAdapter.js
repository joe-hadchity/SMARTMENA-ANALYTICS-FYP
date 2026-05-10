const axios = require("axios");
const env = require("../../../config/env");

const APIFY_BASE = "https://api.apify.com/v2";

// Default keywords for Lebanon-focused trend collection
const DEFAULT_KEYWORDS = [
  "lebanon",
  "hiking lebanon",
  "outdoor activities lebanon",
  "nature lebanon",
  "travel lebanon",
  "tourism lebanon",
];

async function collect({ workspaceId, context, scope, limit = 50 }) {
  if (!env.APIFY_API_TOKEN) {
    return {
      source: "google_trends",
      evidence: [],
      warnings: ["apify_skipped:missing_api_token"],
    };
  }

  try {
    const keywords = (context?.keywords || DEFAULT_KEYWORDS).slice(0, 5);
    const country = context?.location || "LB";
    const language = context?.language || "en";

    const allTrends = [];
    const warnings = [];

    for (const keyword of keywords) {
      const trendResult = await fetchTrendsForKeyword({
        keyword,
        country,
        language,
      });

      if (trendResult.trends) {
        allTrends.push(...trendResult.trends);
      }
      if (trendResult.warnings) {
        warnings.push(...trendResult.warnings);
      }
    }

    const evidence = normalizeToEvidence(allTrends, scope);

    return {
      source: "google_trends",
      evidence: evidence.slice(0, limit),
      warnings,
    };
  } catch (err) {
    return {
      source: "google_trends",
      evidence: [],
      warnings: [`google_trends_failed:${err.message}`],
    };
  }
}

async function fetchTrendsForKeyword({ keyword, country = "LB", language = "en" }) {
  const actorId = "apify~google-trends-scraper";

  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs`,
      {
        searchTerms: [keyword],
        countryCode: country,
        language,
        datasetType: "topCharts",
      },
      {
        timeout: 180_000,
        params: {
          token: env.APIFY_API_TOKEN,
          waitForFinish: 180,
        },
      },
    );

    const run = runRes.data?.data || runRes.data || {};
    if (!run.defaultDatasetId) {
      return { trends: [], warnings: ["apify_trends_missing_dataset"] };
    }

    const itemsRes = await axios.get(
      `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items`,
      {
        timeout: 60_000,
        params: {
          token: env.APIFY_API_TOKEN,
          clean: true,
          format: "json",
          limit: 30,
        },
      },
    );

    const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];
    const trends = items.map((item) => ({
      query: keyword,
      title: item.title || item.searchTerm || keyword,
      articles: item.articles || [],
      traffic: item.traffic || item.percent || 0,
      isRising: Boolean(item.isRising || (item.traffic_change_percent && item.traffic_change_percent > 0)),
      raw_data: item,
    }));
    return { trends, warnings: [] };
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || err.message;
    let warning = `apify_trends_failed:${keyword}`;
    if (status === 402) {
      warning = `apify_trends_quota:${keyword}:billing_or_quota_exceeded`;
    } else if (status) {
      warning = `apify_trends_failed:${keyword}:${status}`;
    }
    return {
      trends: [],
      warnings: [warning],
    };
  }
}

function normalizeToEvidence(trends, scope) {
  return trends.map((trend) => {
    const articles = trend.articles || [];
    const topArticle = articles[0];

    return {
      source: "google_trends",
      provider: "apify",
      type: "search_trend",
      topic: trend.title,
      keywords: [trend.query, trend.title].filter(Boolean),
      engagement_signal: trend.traffic,
      momentum: trend.isRising ? "rising" : "stable",
      caption: `${trend.title} - Trending with ${trend.traffic}% search volume${trend.isRising ? " (rising)" : ""}`,
      url: topArticle?.url || null,
      published_at: new Date().toISOString(),
      media_type: "trend",
      scope: scope || "macro",
      confidence: calculateConfidence(trend),
      raw_payload: {
        trend_data: trend,
        articles: articles.slice(0, 3),
      },
    };
  });
}

function calculateConfidence(trend) {
  let confidence = 0.5;
  if (trend.traffic > 50) confidence += 0.3;
  if (trend.isRising) confidence += 0.2;
  return Math.min(1, confidence);
}

module.exports = {
  collect,
};
