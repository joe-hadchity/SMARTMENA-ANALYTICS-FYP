const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const webhookController = require("../controllers/webhookController");

const router = express.Router();

// Meta verifies this endpoint with hub.challenge.
router.get("/meta", webhookController.verifyMetaWebhook);

// Meta posts Instagram comments/messages events here.
router.post("/meta", asyncHandler(webhookController.receiveMetaWebhook));

module.exports = router;
