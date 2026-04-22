const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const workspaceContext = require("../middleware/workspaceContext");
const { createCampaignSchema } = require("../validators/campaignValidator");
const {
  createCampaign,
  listCampaigns,
  getCampaign,
} = require("../controllers/campaignController");

const router = express.Router();

// Every route resolves the active workspace first so lists + writes are scoped.
router.use(workspaceContext());

router.get("/", asyncHandler(listCampaigns));

router.post("/", validate(createCampaignSchema), asyncHandler(createCampaign));

router.get("/:id", asyncHandler(getCampaign));

module.exports = router;
