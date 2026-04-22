const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  menaRecommendationSchema,
} = require("../validators/recommendationsValidator");
const {
  getMenaRecommendation,
} = require("../controllers/recommendationsController");

const router = express.Router();

router.use(workspaceContext());

// POST /api/recommendations/mena
router.post(
  "/mena",
  validate(menaRecommendationSchema),
  asyncHandler(getMenaRecommendation),
);

module.exports = router;
