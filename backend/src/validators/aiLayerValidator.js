/**
 * Query validators for the workspace-scoped AI layer list endpoints.
 * Body / create-schema for `recommendations` lives next to the service
 * because recommendations are created internally for now (not via a
 * public POST route).
 */

const { z } = require("zod");

const INSIGHT_TYPES = [
  "sentiment_summary",
  "performance_anomaly",
  "content_recommendation",
  "best_posting_time",
  "mena_trend",
];

const SEVERITIES = ["info", "warning", "opportunity"];

const RECOMMENDATION_TYPES = [
  "content",
  "posting_time",
  "mena_event",
  "audience",
  "budget",
  "other",
];

const PRIORITIES = ["low", "medium", "high"];

const listInsightsQuerySchema = z.object({
  insightType: z.enum(INSIGHT_TYPES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  source: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const listRecommendationsQuerySchema = z.object({
  recommendationType: z.enum(RECOMMENDATION_TYPES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

module.exports = {
  listInsightsQuerySchema,
  listRecommendationsQuerySchema,
  INSIGHT_TYPES,
  SEVERITIES,
  RECOMMENDATION_TYPES,
  PRIORITIES,
};
