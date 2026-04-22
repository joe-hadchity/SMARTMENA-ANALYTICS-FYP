const { z } = require("zod");

/**
 * Input schema for POST /api/predict/roi.
 *
 * The HTTP contract uses camelCase (campaignId, contentType, ...). The
 * ML service's /predict-roi uses snake_case. That translation happens
 * inside mlClient.predictRoi; everything above that line -- validator,
 * controller, service -- speaks camelCase.
 *
 * Enum values must stay in sync with:
 *   - ml-service/app/schemas.py  (ROIRequest Literal types)
 *   - backend/db/schema.sql      (campaigns.platform / posts etc.)
 */
const PLATFORMS = ["instagram", "facebook", "tiktok", "twitter"];
const CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"];
const REGIONS = ["Lebanon", "UAE", "Saudi Arabia", "Egypt", "Jordan"];

const predictRoiSchema = z.object({
  campaignId: z.string().uuid({ message: "campaignId must be a valid UUID" }),
  budget: z
    .number({ message: "budget must be a number" })
    .finite()
    .positive({ message: "budget must be greater than 0" }),
  platform: z.enum(PLATFORMS),
  contentType: z.enum(CONTENT_TYPES),
  audienceSize: z
    .number({ message: "audienceSize must be a number" })
    .int({ message: "audienceSize must be an integer" })
    .positive({ message: "audienceSize must be greater than 0" }),
  postingHour: z
    .number({ message: "postingHour must be a number" })
    .int()
    .min(0, { message: "postingHour must be 0-23" })
    .max(23, { message: "postingHour must be 0-23" }),
  sentimentScore: z
    .number({ message: "sentimentScore must be a number" })
    .min(-1, { message: "sentimentScore must be between -1 and 1" })
    .max(1, { message: "sentimentScore must be between -1 and 1" }),
  holidayFlag: z
    .number({ message: "holidayFlag must be a number" })
    .int()
    .min(0)
    .max(1, { message: "holidayFlag must be 0 or 1" }),
  region: z.enum(REGIONS),
});

module.exports = { predictRoiSchema };
