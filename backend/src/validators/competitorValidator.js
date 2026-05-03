const { z } = require("zod");

const platformSchema = z.enum(["meta_instagram", "meta_facebook", "tiktok", "x"]);

const listCompetitorsQuerySchema = z.object({
  platform: platformSchema.optional(),
  include_inactive: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

const listCandidatesQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).optional().default("pending"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const discoverCompetitorsSchema = z.object({
  platform: platformSchema.optional().default("meta_instagram"),
  category: z.string().trim().min(2).max(120).optional(),
  business_category: z.string().trim().min(2).max(120).optional(),
  location: z.string().trim().min(2).max(120).optional(),
  page_name: z.string().trim().max(120).optional(),
  keywords: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((value) =>
      Array.isArray(value)
        ? value
        : String(value || "")
            .split(/[,\n]+/)
            .map((item) => item.trim())
            .filter(Boolean),
    ),
  hashtags: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((value) =>
      Array.isArray(value)
        ? value
        : String(value || "")
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean),
    ),
  audience_size: z.union([z.string(), z.number()]).optional(),
  limit: z.coerce.number().int().min(3).max(30).optional().default(12),
});

const manualCompetitorSchema = z.object({
  platform: platformSchema.optional().default("meta_instagram"),
  handle: z.string().trim().min(2).max(200),
  display_name: z.string().trim().max(120).optional(),
  profile_url: z.string().trim().max(300).optional(),
  region: z.string().trim().max(60).optional(),
  industry: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).optional().default([]),
});

const comparisonQuerySchema = z.object({
  window_days: z.coerce.number().int().min(7).max(180).optional().default(30),
});

module.exports = {
  comparisonQuerySchema,
  discoverCompetitorsSchema,
  listCandidatesQuerySchema,
  listCompetitorsQuerySchema,
  manualCompetitorSchema,
};
