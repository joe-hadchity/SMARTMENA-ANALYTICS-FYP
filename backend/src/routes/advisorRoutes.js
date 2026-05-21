const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const workspaceContext = require("../middleware/workspaceContext");
const controller = require("../controllers/advisorCampaignsController");

const router = express.Router();

// List campaigns
router.get(
  "/campaigns",
  workspaceContext(),
  asyncHandler(controller.listAdvisorCampaigns)
);

// Get campaign details
router.get(
  "/campaigns/:campaignId",
  workspaceContext(),
  asyncHandler(controller.getAdvisorCampaignDetails)
);

// Get campaign insights
router.get(
  "/campaigns/:campaignId/insights",
  workspaceContext(),
  asyncHandler(controller.getAdvisorCampaignInsights)
);

// List ad sets for a campaign
router.get(
  "/campaigns/:campaignId/adsets",
  workspaceContext(),
  asyncHandler(controller.listAdvisorAdSets)
);

// Get ad set details
router.get(
  "/campaigns/:campaignId/adsets/:adsetId",
  workspaceContext(),
  asyncHandler(controller.getAdvisorAdSetDetails)
);

// List ads for an ad set
router.get(
  "/campaigns/:campaignId/adsets/:adsetId/ads",
  workspaceContext(),
  asyncHandler(controller.listAdvisorAds)
);

// Get ad details
router.get(
  "/campaigns/:campaignId/adsets/:adsetId/ads/:adId",
  workspaceContext(),
  asyncHandler(controller.getAdvisorAdDetails)
);

module.exports = router;
