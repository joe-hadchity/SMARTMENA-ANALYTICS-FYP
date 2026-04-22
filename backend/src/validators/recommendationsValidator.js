const { z } = require("zod");

const PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "twitter",
  "meta_instagram",
  "meta_facebook",
];

const REGIONS = ["LB", "AE", "SA", "EG", "JO"];

const CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"];

const menaRecommendationSchema = z.object({
  platform: z.enum(PLATFORMS),
  region: z.enum(REGIONS),
  contentType: z.enum(CONTENT_TYPES).optional(),
  budget: z.number().positive().optional(),
  audienceSize: z.number().int().positive().optional(),
});

module.exports = { menaRecommendationSchema, PLATFORMS, REGIONS, CONTENT_TYPES };
