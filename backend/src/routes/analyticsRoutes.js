const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  timeseriesQuerySchema,
  topPostsQuerySchema,
} = require("../validators/analyticsValidator");
const {
  getOverview,
  getTimeseries,
  getPlatformBreakdown,
  getSentimentBreakdown,
  getTopPosts,
} = require("../controllers/analyticsController");

const router = express.Router();

router.use(workspaceContext());

// GET /api/analytics/overview
router.get("/overview", asyncHandler(getOverview));

// GET /api/analytics/timeseries?metric=engagement|reach|impressions&groupBy=day|week
router.get(
  "/timeseries",
  validate(timeseriesQuerySchema, "query"),
  asyncHandler(getTimeseries),
);

// GET /api/analytics/platform-breakdown
router.get("/platform-breakdown", asyncHandler(getPlatformBreakdown));

// GET /api/analytics/sentiment-breakdown
router.get("/sentiment-breakdown", asyncHandler(getSentimentBreakdown));

// GET /api/analytics/top-posts?limit=10&sortBy=engagement
router.get(
  "/top-posts",
  validate(topPostsQuerySchema, "query"),
  asyncHandler(getTopPosts),
);

module.exports = router;
