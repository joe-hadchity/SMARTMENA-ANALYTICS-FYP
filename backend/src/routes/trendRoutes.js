const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const workspaceContext = require("../middleware/workspaceContext");
const trendIntelligenceService = require("../services/trendIntelligence/trendIntelligenceService");

const router = express.Router();

router.use(workspaceContext());

// GET /api/trends
// Returns trend intelligence dashboard with macro and micro trends
// Query params: scope (all|micro|macro), limit (default 80), brand_id
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const dashboard = await trendIntelligenceService.buildDashboard({
      workspaceId: req.workspaceId,
      brandId: req.query.brand_id || null,
      scope: req.query.scope || "all",
      limit: req.query.limit ? Number(req.query.limit) : 80,
    });
    res.json(dashboard);
  }),
);

module.exports = router;
