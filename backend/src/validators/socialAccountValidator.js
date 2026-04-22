const { z } = require("zod");

const META_KINDS = ["instagram", "facebook"];

const PLATFORMS = ["meta_instagram", "meta_facebook", "tiktok", "x"];

const ACCOUNT_STATUSES = ["connected", "disconnected", "error"];

const ACCOUNT_TYPES = ["business", "creator", "personal", "page"];

const connectMetaSchema = z.object({
  kind: z.enum(META_KINDS),
  handle: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-zA-Z0-9_.-]+$/, {
      message: "handle must contain only letters, digits, dots, underscores, or hyphens",
    })
    .optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
});

// Generic POST /api/social-accounts -- platform-agnostic create. For the
// mock Meta OAuth flow use POST /api/social-accounts/connect/meta instead.
// `workspace_id` is optional; when omitted, the workspaceContext middleware
// resolves it from the x-workspace-id header (or the demo fallback).
const createSocialAccountSchema = z.object({
  workspace_id: z.string().uuid().optional(),
  platform: z.enum(PLATFORMS),
  account_name: z.string().trim().min(1).max(120).optional(),
  account_external_id: z.string().trim().min(1).max(120),
  account_type: z.enum(ACCOUNT_TYPES).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  metadata_json: z.record(z.any()).optional(),
});

module.exports = {
  connectMetaSchema,
  createSocialAccountSchema,
  META_KINDS,
  PLATFORMS,
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
};
