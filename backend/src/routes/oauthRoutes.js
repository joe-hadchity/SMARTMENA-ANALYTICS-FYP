/**
 * OAuth routes -- Meta (Instagram + Facebook) Graph v19.
 *
 * /callback MUST NOT sit behind workspaceContext because the redirect from
 * Facebook is triggered by the end-user's browser and carries no
 * `x-workspace-id` header; the workspace is resolved from the oauth_states
 * row instead.
 */

const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const workspaceContext = require("../middleware/workspaceContext");
const {
  status,
  initMeta,
  callbackMeta,
  syncMeta,
  revokeMeta,
} = require("../controllers/oauthController");

const router = express.Router();

// Public probe (no workspace header required).
router.get("/meta/status", asyncHandler(status));

// Callback from Facebook -- strictly public. The user's browser is the
// redirect target after they click "Authorize" on facebook.com.
router.get("/meta/callback", asyncHandler(callbackMeta));

// Workspace-scoped endpoints.
router.use(workspaceContext());

router.get("/meta/init", asyncHandler(initMeta));
router.post("/meta/sync", asyncHandler(syncMeta));
router.delete("/meta/connection/:id", asyncHandler(revokeMeta));

module.exports = router;
