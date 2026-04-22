const { z } = require("zod");
const { PLATFORMS } = require("./contentScoreValidator");

const SOURCES = ["manual", "ad_library", "business_discovery", "mock"];

const createCompetitorSchema = z.object({
  platform: z.enum(PLATFORMS),
  handle: z.string().trim().min(1).max(120),
  display_name: z.string().trim().max(200).nullable().optional(),
  external_account_id: z.string().trim().max(200).nullable().optional(),
  avatar_url: z.string().trim().max(500).nullable().optional(),
  profile_url: z.string().trim().max(500).nullable().optional(),
  region: z.string().trim().max(8).nullable().optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  tags: z.array(z.string().trim().max(60)).max(20).optional(),
  source: z.enum(SOURCES).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateCompetitorSchema = createCompetitorSchema.partial().extend({
  is_active: z.boolean().optional(),
});

const runDigestSchema = z.object({
  window_days: z.number().int().min(1).max(30).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  delivery_target: z.string().trim().max(300).nullable().optional(),
  skip_refresh: z.boolean().optional(),
});

module.exports = {
  createCompetitorSchema,
  updateCompetitorSchema,
  runDigestSchema,
  SOURCES,
};
