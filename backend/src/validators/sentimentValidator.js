const { z } = require("zod");

/**
 * Input schema for POST /api/analyze/sentiment.
 *
 * The request uses camelCase on the HTTP boundary (postId) because that is
 * what the rest of the public API exposes. Internally we map postId -> post_id
 * when writing to the sentiment_results table in Supabase.
 */
const analyzeSentimentSchema = z.object({
  postId: z.string().uuid({ message: "postId must be a valid UUID" }),
  text: z
    .string()
    .trim()
    .min(1, { message: "text is required" })
    .max(5000, { message: "text must be 5000 characters or fewer" }),
});

module.exports = { analyzeSentimentSchema };
