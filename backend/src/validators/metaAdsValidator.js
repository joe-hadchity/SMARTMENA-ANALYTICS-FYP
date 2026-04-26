const { z } = require("zod");

const CAMPAIGN_OBJECTIVES = [
  "LINK_CLICKS",
  "CONVERSIONS",
  "PAGE_LIKES",
  "POST_ENGAGEMENT",
  "BRAND_AWARENESS",
  "APP_INSTALLS",
  "REACH",
  "VIDEO_VIEWS",
  "LEAD_GENERATION",
  "MESSAGES",
  "STORE_VISITS",
];

const CAMPAIGN_STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"];

const OPTIMIZATION_GOALS = [
  "LINK_CLICKS",
  "IMPRESSIONS",
  "REACH",
  "PAGE_LIKES",
  "POST_ENGAGEMENT",
  "APP_INSTALLS",
  "LANDING_PAGE_VIEWS",
  "CONVERSIONS",
  "VALUE",
];

const BILLING_EVENTS = [
  "IMPRESSIONS",
  "PAGE_LIKES",
  "CLICKS",
  "APP_INSTALLS",
  "VIDEO_VIEWS",
  "OFFER_CLAIMS",
  "LINK_CLICKS",
];

const CTA_TYPES = [
  "LEARN_MORE",
  "SHOP_NOW",
  "BOOK_NOW",
  "SIGN_UP",
  "DOWNLOAD",
  "WATCH_MORE",
  "GET_OFFER",
  "INSTALL_APP",
  "APPLY_NOW",
  "CONTACT_US",
  "SUBSCRIBE",
  "GET_QUOTE",
  "ORDER_NOW",
  "CALL_NOW",
];

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

const createMetaCampaignSchema = z.object({
  adAccountId: z.string().min(1),
  name: z.string().min(1).max(400),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  status: z.enum(CAMPAIGN_STATUSES).optional().default("PAUSED"),
  buyingType: z.string().optional().default("AUCTION"),
  dailyBudget: z.number().int().positive().optional(),
  lifetimeBudget: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  specialAdCategories: z.array(z.string()).optional().default([]),
});

const updateMetaCampaignSchema = z.object({
  name: z.string().min(1).max(400).optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  dailyBudget: z.number().int().positive().optional(),
  lifetimeBudget: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Ad Sets
// ---------------------------------------------------------------------------

const targetingSchema = z.object({
  geo_locations: z
    .object({
      countries: z.array(z.string()).optional(),
      regions: z.array(z.object({ key: z.string() })).optional(),
      cities: z.array(z.object({ key: z.string(), name: z.string() })).optional(),
    })
    .optional(),
  age_min: z.number().int().min(13).max(65).optional(),
  age_max: z.number().int().min(13).max(65).optional(),
  genders: z.array(z.number().int()).optional(),
  interests: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional(),
  publisher_platforms: z.array(z.string()).optional(),
  facebook_positions: z.array(z.string()).optional(),
  instagram_positions: z.array(z.string()).optional(),
}).passthrough();

const createAdsetSchema = z.object({
  adAccountId: z.string().min(1),
  campaignId: z.string().min(1),
  name: z.string().min(1).max(400),
  optimizationGoal: z.enum(OPTIMIZATION_GOALS),
  billingEvent: z.enum(BILLING_EVENTS),
  dailyBudget: z.number().int().positive().optional(),
  lifetimeBudget: z.number().int().positive().optional(),
  bidAmount: z.number().int().positive().optional(),
  targeting: targetingSchema,
  status: z.enum(CAMPAIGN_STATUSES).optional().default("PAUSED"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const updateAdsetSchema = z.object({
  name: z.string().min(1).max(400).optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  dailyBudget: z.number().int().positive().optional(),
  bidAmount: z.number().int().positive().optional(),
  targeting: targetingSchema.optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Ad Creatives
// ---------------------------------------------------------------------------

const callToActionSchema = z.object({
  type: z.enum(CTA_TYPES),
  link: z.string().url(),
});

const linkDataSchema = z.object({
  link: z.string().url(),
  message: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
  imageHash: z.string().optional(),
  callToAction: callToActionSchema.optional(),
});

const objectStorySpecSchema = z.object({
  pageId: z.string().min(1),
  linkData: linkDataSchema,
});

const createCreativeSchema = z.object({
  adAccountId: z.string().min(1),
  name: z.string().min(1).max(400),
  objectStorySpec: objectStorySpecSchema,
});

module.exports = {
  createMetaCampaignSchema,
  updateMetaCampaignSchema,
  createAdsetSchema,
  updateAdsetSchema,
  createCreativeSchema,
};
