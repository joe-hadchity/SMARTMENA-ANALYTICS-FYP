const { z } = require("zod");

const KINDS = ["all", "hashtag", "topic", "format", "sound"];
const SORTS = ["volume", "engagement", "avg_engagement"];
const SOURCES = ["all", "own", "competitor"];

const listTrendsQuery = z.object({
  kind: z.enum(KINDS).optional(),
  window_days: z.coerce.number().int().min(1).max(90).optional(),
  sort_by: z.enum(SORTS).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  platform: z.string().trim().max(40).optional(),
  source: z.enum(SOURCES).optional(),
  search: z.string().trim().max(120).optional(),
});

const trendDetailQuery = z.object({
  window_days: z.coerce.number().int().min(1).max(90).optional(),
});

const rebuildBody = z.object({
  window_days: z.number().int().min(1).max(90).optional(),
  allow_llm: z.boolean().optional(),
});

module.exports = {
  KINDS,
  SORTS,
  SOURCES,
  listTrendsQuery,
  trendDetailQuery,
  rebuildBody,
};
