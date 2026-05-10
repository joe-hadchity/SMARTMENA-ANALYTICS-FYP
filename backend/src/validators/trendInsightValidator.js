const { z } = require("zod");

const trendIntelligenceQuerySchema = z.object({
  brand_id: z.string().uuid().optional(),
  scope: z.enum(["micro", "macro", "all"]).optional().default("all"),
  limit: z.coerce.number().int().min(10).max(150).optional().default(80),
});

module.exports = {
  trendIntelligenceQuerySchema,
};
