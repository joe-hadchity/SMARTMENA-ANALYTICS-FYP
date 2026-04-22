import { z } from "zod";

export const ROI_PLATFORMS = ["instagram", "facebook", "tiktok", "twitter"];
export const ROI_CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"];
export const ROI_REGIONS = [
  "Lebanon",
  "UAE",
  "Saudi Arabia",
  "Egypt",
  "Jordan",
];

export const roiSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign id"),
  budget: z.coerce.number().positive("Budget must be greater than 0"),
  platform: z.enum(ROI_PLATFORMS, {
    errorMap: () => ({ message: "Pick a platform" }),
  }),
  contentType: z.enum(ROI_CONTENT_TYPES, {
    errorMap: () => ({ message: "Pick a content type" }),
  }),
  audienceSize: z.coerce
    .number()
    .int("Audience must be a whole number")
    .positive("Audience must be greater than 0"),
  postingHour: z.coerce
    .number()
    .int()
    .min(0, "0 - 23 only")
    .max(23, "0 - 23 only"),
  sentimentScore: z.coerce
    .number()
    .min(-1, "Between -1 and 1")
    .max(1, "Between -1 and 1"),
  holidayFlag: z.coerce.number().int().min(0).max(1),
  region: z.enum(ROI_REGIONS, {
    errorMap: () => ({ message: "Pick a region" }),
  }),
});

export const roiDefaults = {
  budget: 2500,
  platform: "instagram",
  contentType: "image",
  audienceSize: 80000,
  postingHour: 19,
  sentimentScore: 0,
  holidayFlag: 0,
  region: "UAE",
};
