import { z } from "zod";

export const PLATFORMS = ["facebook", "instagram", "tiktok", "google", "x"];
export const REGIONS = ["LB", "AE", "SA", "EG", "JO"];
export const CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"];

export const campaignSchema = z.object({
  campaign_name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name is too long"),
  platform: z.enum(PLATFORMS, { errorMap: () => ({ message: "Pick a platform" }) }),
  budget: z
    .coerce.number({ invalid_type_error: "Budget must be a number" })
    .finite()
    .nonnegative("Budget must be 0 or more"),
  audience_size: z
    .coerce.number({ invalid_type_error: "Audience must be a number" })
    .int("Audience must be a whole number")
    .nonnegative("Audience must be 0 or more")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  content_type: z.enum(CONTENT_TYPES).optional(),
  region: z.enum(REGIONS, { errorMap: () => ({ message: "Pick a region" }) }),
});

export const campaignDefaults = {
  campaign_name: "Ramadan launch",
  platform: "instagram",
  budget: 2500,
  audience_size: 80000,
  content_type: "image",
  region: "AE",
};
