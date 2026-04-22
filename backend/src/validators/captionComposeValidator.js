const { z } = require("zod");
const { PLATFORMS } = require("./contentScoreValidator");

const LANGUAGES = ["ar", "en", "mix"];
const DIALECTS = ["khaleeji", "levantine", "egyptian", "maghrebi", "msa"];
const LENGTHS = ["short", "medium", "long"];
// Content formats supported by the Content Studio. `post` keeps the legacy
// "caption" behaviour, so existing clients keep working without changes.
const FORMATS = [
  "post",
  "story",
  "reel_script",
  "thread",
  "tweet",
  "facebook_post",
  "ad",
];

const composeCaptionsSchema = z.object({
  workspace_id: z.string().uuid().optional(),
  brief: z.string().trim().min(2).max(2000),
  platform: z.enum(PLATFORMS),
  format: z.enum(FORMATS).optional(),
  language: z.enum(LANGUAGES).optional(),
  dialect: z.enum(DIALECTS).optional(),
  tone: z.string().trim().max(40).optional(),
  length: z.enum(LENGTHS).optional(),
  count: z.number().int().min(1).max(5).optional(),
  callToAction: z.string().trim().max(120).optional(),
  hashtags: z.array(z.string().trim().max(60)).max(12).optional(),
  audience: z.string().trim().max(300).optional(),
  locale: z.enum(["en", "ar"]).optional(),
});

module.exports = {
  composeCaptionsSchema,
  LANGUAGES,
  DIALECTS,
  LENGTHS,
  FORMATS,
};
