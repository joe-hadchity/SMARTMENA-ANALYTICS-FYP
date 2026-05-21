const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const workspaceContext = require("../middleware/workspaceContext");
const controller = require("../controllers/advisorContextController");

const router = express.Router();

// Get context for advisor (historical campaigns, account stats, etc.)
router.get(
  "/context",
  workspaceContext(),
  asyncHandler(controller.getAdvisorContext)
);

module.exports = router;
