const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { analyzeSentimentSchema } = require("../validators/sentimentValidator");
const { analyzeSentiment } = require("../controllers/sentimentController");

const router = express.Router();

// POST /api/analyze/sentiment
router.post(
  "/sentiment",
  validate(analyzeSentimentSchema),
  asyncHandler(analyzeSentiment),
);

module.exports = router;
