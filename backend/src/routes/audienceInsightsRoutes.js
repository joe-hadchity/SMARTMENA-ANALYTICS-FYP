const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const workspaceContext = require("../middleware/workspaceContext");
const {
  getAudienceInsights,
  refreshAudienceInsights,
} = require("../controllers/audienceInsightsController");

const router = express.Router();

router.use(workspaceContext());

// GET /api/audience-insights?days=90
router.get("/", asyncHandler(getAudienceInsights));

// POST /api/audience-insights/refresh
router.post("/refresh", asyncHandler(refreshAudienceInsights));

module.exports = router;
