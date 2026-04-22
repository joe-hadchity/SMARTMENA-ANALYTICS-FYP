const { z } = require("zod");

const createPostSchema = z.object({
  campaign_id: z.string().uuid({ message: "campaign_id must be a valid UUID" }),
  text_content: z.string().trim().min(1).max(5000),
  language: z.string().trim().min(2).max(10).optional().default("ar"),
});

module.exports = { createPostSchema };
