import { z } from "zod";

export const sentimentSchema = z.object({
  postId: z.string().uuid("Invalid post id"),
  text: z
    .string()
    .trim()
    .min(1, "Text is required")
    .max(5000, "Text is too long"),
});
