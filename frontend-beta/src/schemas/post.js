import { z } from "zod";

export const postSchema = z.object({
  campaign_id: z.string().uuid("Invalid campaign id"),
  text_content: z
    .string()
    .trim()
    .min(1, "Post text is required")
    .max(5000, "Text is too long"),
  language: z.string().trim().min(2).max(10).optional(),
});

export const postSamples = [
  { key: "positive", label: "Positive (ar)", text: "المنتج ممتاز وسعره مناسب" },
  {
    key: "negative",
    label: "Negative (ar)",
    text: "الخدمة سيئة جدا ولم أحصل على ردود",
  },
  { key: "neutral", label: "Neutral (ar)", text: "تم استلام الطلب اليوم" },
];
