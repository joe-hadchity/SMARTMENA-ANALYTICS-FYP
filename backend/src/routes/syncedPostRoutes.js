const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  listSyncedPostsQuerySchema,
  listMetricsQuerySchema,
} = require("../validators/syncedPostValidator");
const {
  listSyncedPosts,
  getSyncedPost,
  listSyncedPostMetrics,
} = require("../controllers/syncedPostController");

const router = express.Router();

router.use(workspaceContext());

// GET /api/synced-posts
router.get(
  "/",
  validate(listSyncedPostsQuerySchema, "query"),
  asyncHandler(listSyncedPosts),
);

// GET /api/synced-posts/:id
router.get("/:id", asyncHandler(getSyncedPost));

// GET /api/synced-posts/:id/metrics
router.get(
  "/:id/metrics",
  validate(listMetricsQuerySchema, "query"),
  asyncHandler(listSyncedPostMetrics),
);

module.exports = router;
