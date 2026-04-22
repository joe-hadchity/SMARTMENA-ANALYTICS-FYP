const { z } = require("zod");
const { PLATFORMS } = require("./contentScoreValidator");

const STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
];

const hashtagsSchema = z
  .array(z.string().trim().max(60))
  .max(30)
  .optional();

const createScheduledPostSchema = z.object({
  workspace_id: z.string().uuid().optional(),
  social_account_id: z.string().uuid().nullable().optional(),
  platform: z.enum(PLATFORMS),
  caption: z.string().trim().min(1).max(5000),
  language: z.enum(["ar", "en", "mix"]).nullable().optional(),
  dialect: z.string().trim().max(32).nullable().optional(),
  media_urls: z.array(z.string().trim().max(500)).max(10).optional(),
  hashtags: hashtagsSchema,
  scheduled_at: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: "scheduled_at must be an ISO-8601 timestamp",
    }),
  status: z.enum(STATUSES).optional(),
  mena_event_id: z.string().uuid().nullable().optional(),
  content_score_json: z.record(z.any()).optional(),
  metadata_json: z.record(z.any()).optional(),
});

const updateScheduledPostSchema = createScheduledPostSchema
  .partial()
  .extend({
    scheduled_at: z
      .string()
      .refine((v) => !Number.isNaN(new Date(v).getTime()), {
        message: "scheduled_at must be an ISO-8601 timestamp",
      })
      .optional(),
  });

module.exports = {
  createScheduledPostSchema,
  updateScheduledPostSchema,
  STATUSES,
};
