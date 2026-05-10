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

const DIALECTS = ["khaleeji", "levantine", "egyptian", "maghrebi", "msa"];

const stringList = z.array(z.string().trim().min(1).max(80)).max(30);
const optionalText = (max) => z.string().trim().max(max).optional();

const updateBusinessProfileSchema = z.object({
  business_name: z.string().trim().min(1).max(120).optional(),
  page_name: z.string().trim().min(1).max(120).optional(),
  instagram_handle: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value.replace(/^@+/, ""))
    .optional(),
  category: optionalText(80),
  business_type: optionalText(80),
  location: optionalText(120),
  country: z.enum(REGIONS).optional(),
  website: z
    .union([z.string().trim().url(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  bio: optionalText(1200),
  about: optionalText(2000),
  audience: optionalText(500),
  keywords: stringList.optional(),
  hashtags: stringList.optional(),
  tone_keywords: stringList.optional(),
  content_pillars: stringList.optional(),
  goals: stringList.optional(),
  platforms: stringList.optional(),
  primary_platform: optionalText(80),
  content_formats: stringList.optional(),
  posting_frequency: optionalText(80),
  onboarding_completed: z.boolean().optional(),
  default_dialect: z.enum(DIALECTS).optional(),
});

module.exports = {
  createWorkspaceSchema,
  updateBusinessProfileSchema,
  LOCALES,
  REGIONS,
  DIALECTS,
};
