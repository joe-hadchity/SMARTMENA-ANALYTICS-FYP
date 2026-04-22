const { z } = require("zod");

const SCOPE_TYPES = ["workspace", "campaign", "social_account", "synced_post"];
const INSIGHT_TYPES = [
  "sentiment_summary",
  "performance_anomaly",
  "content_recommendation",
  "best_posting_time",
  "mena_trend",
];
const SEVERITIES = ["info", "warning", "opportunity"];

const listInsightsQuerySchema = z.object({
  scopeType: z.enum(SCOPE_TYPES).optional(),
  insightType: z.enum(INSIGHT_TYPES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const generateInsightsSchema = z
  .object({
    scopeType: z.enum(SCOPE_TYPES).optional(),
    scopeId: z.string().uuid().optional(),
  })
  .optional();

module.exports = {
  listInsightsQuerySchema,
  generateInsightsSchema,
  SCOPE_TYPES,
  INSIGHT_TYPES,
  SEVERITIES,
};
