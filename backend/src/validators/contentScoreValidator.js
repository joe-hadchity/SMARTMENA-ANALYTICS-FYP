const { z } = require("zod");

const PLATFORMS = [
  "meta_instagram",
  "meta_facebook",
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "twitter",
];

const REGIONS = ["LB", "AE", "SA", "EG", "JO"];

const CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"];

const scoreContentSchema = z.object({
  platform: z.enum(PLATFORMS),
  captionText: z.string().trim().min(1).max(4000),
  region: z.enum(REGIONS).optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  budget: z.number().positive().optional(),
  audienceSize: z.number().int().positive().optional(),
  postingHour: z.number().int().min(0).max(23).optional(),
  workspace_id: z.string().uuid().optional(),
});

module.exports = {
  scoreContentSchema,
  PLATFORMS,
  REGIONS,
  CONTENT_TYPES,
};
