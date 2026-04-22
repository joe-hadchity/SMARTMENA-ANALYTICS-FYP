const { z } = require("zod");

const MEDIA_TYPES = ["image", "video", "carousel", "reel", "story", "text"];

const listSocialPostsQuerySchema = z.object({
  mediaType: z.enum(MEDIA_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const metricsHistoryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

module.exports = {
  listSocialPostsQuerySchema,
  metricsHistoryQuerySchema,
  MEDIA_TYPES,
};
