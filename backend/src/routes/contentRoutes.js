const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const {
  scoreContentSchema,
} = require("../validators/contentScoreValidator");
const {
  composeCaptionsSchema,
} = require("../validators/captionComposeValidator");
const {
  scoreContent,
  composeContent,
} = require("../controllers/contentScoreController");

const router = express.Router();

router.use(workspaceContext());

// POST /api/content/score
router.post("/score", validate(scoreContentSchema), asyncHandler(scoreContent));

// POST /api/content/compose -- caption studio: ranked bilingual variants
router.post(
  "/compose",
  validate(composeCaptionsSchema),
  asyncHandler(composeContent),
);

module.exports = router;
