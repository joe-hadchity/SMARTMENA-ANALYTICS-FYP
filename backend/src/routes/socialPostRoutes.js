const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  metricsHistoryQuerySchema,
} = require("../validators/socialPostValidator");
const {
  listAllSocialPosts,
  refreshOwnPosts,
  getSocialPost,
  getPostMetricsHistory,
} = require("../controllers/socialPostController");

const router = express.Router();

router.use(workspaceContext());

// GET /api/social-posts
router.get("/", asyncHandler(listAllSocialPosts));

// POST /api/social-posts/refresh  — re-scrape own Instagram via Apify
router.post("/refresh", asyncHandler(refreshOwnPosts));

// GET /api/social-posts/:id/metrics-history
router.get(
  "/:id/metrics-history",
  validate(metricsHistoryQuerySchema, "query"),
  asyncHandler(getPostMetricsHistory),
);

// GET /api/social-posts/:id
router.get("/:id", asyncHandler(getSocialPost));

module.exports = router;
