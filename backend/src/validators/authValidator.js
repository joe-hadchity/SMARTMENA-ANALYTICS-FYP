const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  workspaceName: z.string().trim().min(2).optional(),
  region: z.string().trim().min(2).max(8).optional(),
  locale: z.enum(["ar", "en"]).optional(),
  industry: z.string().trim().min(2).optional(),
});

const born2HikeBootstrapSchema = z.object({
  email: z.string().trim().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().trim().min(1).optional(),
});

module.exports = {
  loginSchema,
  registerSchema,
  born2HikeBootstrapSchema,
};
