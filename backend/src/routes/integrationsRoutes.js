const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const {
  getPlatformCapabilities,
} = require("../controllers/integrationsController");

const router = express.Router();

// GET /api/integrations/platform-capabilities
router.get("/platform-capabilities", asyncHandler(getPlatformCapabilities));

module.exports = router;
