const { z } = require("zod");

const timeseriesQuerySchema = z.object({
  metric: z.enum(["engagement", "reach", "impressions"]).optional(),
  groupBy: z.enum(["day", "week"]).optional(),
});

const topPostsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  sortBy: z
    .enum(["engagement", "reach", "impressions", "engagement_rate"])
    .optional(),
});

module.exports = { timeseriesQuerySchema, topPostsQuerySchema };
