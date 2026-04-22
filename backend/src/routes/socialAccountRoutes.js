const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  connectMetaSchema,
  createSocialAccountSchema,
} = require("../validators/socialAccountValidator");
const { syncAccountSchema } = require("../validators/syncedPostValidator");
const {
  listSocialPostsQuerySchema,
} = require("../validators/socialPostValidator");
const {
  listSocialAccounts,
  getSocialAccount,
  deleteSocialAccount,
  connectMeta,
  createSocialAccount,
  syncSocialAccount,
} = require("../controllers/socialAccountController");
const {
  listPostsForAccount,
} = require("../controllers/socialPostController");

const router = express.Router();

router.use(workspaceContext());

// GET /api/social-accounts
router.get("/", asyncHandler(listSocialAccounts));

// POST /api/social-accounts -- platform-agnostic create.
router.post(
  "/",
  validate(createSocialAccountSchema),
  asyncHandler(createSocialAccount),
);

// POST /api/social-accounts/connect/meta
router.post(
  "/connect/meta",
  validate(connectMetaSchema),
  asyncHandler(connectMeta),
);

// POST /api/social-accounts/:id/sync
router.post(
  "/:id/sync",
  validate(syncAccountSchema),
  asyncHandler(syncSocialAccount),
);

// GET /api/social-accounts/:id/posts
router.get(
  "/:id/posts",
  validate(listSocialPostsQuerySchema, "query"),
  asyncHandler(listPostsForAccount),
);

// GET /api/social-accounts/:id
router.get("/:id", asyncHandler(getSocialAccount));

// DELETE /api/social-accounts/:id
router.delete("/:id", asyncHandler(deleteSocialAccount));

module.exports = router;
