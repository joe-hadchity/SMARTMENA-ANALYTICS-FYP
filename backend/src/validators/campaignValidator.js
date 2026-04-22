const { z } = require("zod");

const PLATFORMS = ["facebook", "instagram", "tiktok", "google", "x"];

const createCampaignSchema = z.object({
  user_id: z.string().uuid({ message: "user_id must be a valid UUID" }),
  campaign_name: z.string().trim().min(1).max(200),
  platform: z.enum(PLATFORMS),
  budget: z.number().finite().nonnegative(),
  audience_size: z.number().int().nonnegative().optional(),
  content_type: z.string().trim().min(1).max(50).optional(),
  posting_time: z
    .string()
    .datetime({ message: "posting_time must be an ISO 8601 datetime string" })
    .optional(),
  region: z.string().trim().min(1).max(10).optional(),
});

module.exports = { createCampaignSchema };
