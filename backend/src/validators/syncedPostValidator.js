const { z } = require("zod");

const LANGS = ["ar", "en", "mixed"];
const POST_TYPES = ["image", "video", "carousel", "reel", "story", "text"];

const listSyncedPostsQuerySchema = z.object({
  socialAccountId: z.string().uuid().optional(),
  lang: z.enum(LANGS).optional(),
  postType: z.enum(POST_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const listMetricsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const syncAccountSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    daysBack: z.coerce.number().int().min(1).max(365).optional(),
  })
  .optional();

module.exports = {
  listSyncedPostsQuerySchema,
  listMetricsQuerySchema,
  syncAccountSchema,
  LANGS,
  POST_TYPES,
};
