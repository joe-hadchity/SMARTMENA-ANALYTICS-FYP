const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  listInsightsQuerySchema,
  generateInsightsSchema,
} = require("../validators/insightsValidator");
const {
  listInsights,
  generateInsights,
} = require("../controllers/insightsController");

const router = express.Router();

router.use(workspaceContext());

// GET /api/insights
router.get(
  "/",
  validate(listInsightsQuerySchema, "query"),
  asyncHandler(listInsights),
);

// POST /api/insights/generate
router.post(
  "/generate",
  validate(generateInsightsSchema),
  asyncHandler(generateInsights),
);

module.exports = router;
