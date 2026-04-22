const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const { predictRoiSchema } = require("../validators/roiValidator");
const { predictRoi } = require("../controllers/roiController");

const router = express.Router();

// POST /api/predict/roi
router.post(
  "/roi",
  validate(predictRoiSchema),
  asyncHandler(predictRoi),
);

module.exports = router;
