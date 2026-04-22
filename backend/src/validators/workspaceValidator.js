const { z } = require("zod");

const LOCALES = ["ar", "en"];
const REGIONS = ["LB", "AE", "SA", "EG", "JO", "QA", "KW", "OM", "BH", "MA"];

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, {
      message: "slug must be lowercase letters, digits, and hyphens only",
    })
    .optional(),
  region: z.enum(REGIONS).optional(),
  region_default: z.enum(REGIONS).optional(),
  locale_default: z.enum(LOCALES).optional(),
  industry: z.string().trim().min(1).max(60).optional(),
  owner_user_id: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Brand voice (v6)
// ---------------------------------------------------------------------------

const DIALECTS = ["khaleeji", "levantine", "egyptian", "maghrebi", "msa"];

const brandVoiceInnerSchema = z.object({
  tone_keywords: z.array(z.string().trim().min(1).max(40)).max(25).optional(),
  do: z.array(z.string().trim().min(1).max(160)).max(25).optional(),
  dont: z.array(z.string().trim().min(1).max(160)).max(25).optional(),
  sample_phrases: z.array(z.string().trim().min(1).max(240)).max(25).optional(),
  default_dialect: z.enum(DIALECTS).optional(),
});

const updateBrandVoiceSchema = z
  .object({
    industry_hint: z.string().trim().min(1).max(60).optional(),
    primary_region: z.enum(REGIONS).optional(),
    brand_voice: brandVoiceInnerSchema.optional(),
  })
  .refine(
    (obj) =>
      obj.industry_hint !== undefined ||
      obj.primary_region !== undefined ||
      obj.brand_voice !== undefined,
    { message: "Provide at least one of industry_hint, primary_region, brand_voice" },
  );

module.exports = {
  createWorkspaceSchema,
  updateBrandVoiceSchema,
  LOCALES,
  REGIONS,
  DIALECTS,
};
