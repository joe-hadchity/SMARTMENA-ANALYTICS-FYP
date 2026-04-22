const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const {
  metricsHistoryQuerySchema,
} = require("../validators/socialPostValidator");
const {
  getSocialPost,
  getPostMetricsHistory,
} = require("../controllers/socialPostController");

const router = express.Router();

// GET /api/social-posts/:id/metrics-history
router.get(
  "/:id/metrics-history",
  validate(metricsHistoryQuerySchema, "query"),
  asyncHandler(getPostMetricsHistory),
);

// GET /api/social-posts/:id
router.get("/:id", asyncHandler(getSocialPost));

module.exports = router;
