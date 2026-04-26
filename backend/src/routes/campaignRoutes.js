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
const {
  createMetaCampaignSchema,
  updateMetaCampaignSchema,
  createAdsetSchema,
  updateAdsetSchema,
  createCreativeSchema,
} = require("../validators/metaAdsValidator");
const {
  getAdAccounts,
  listMetaCampaigns,
  getMetaCampaign,
  createMetaCampaign,
  updateMetaCampaign,
  deleteMetaCampaign,
  listAdsets,
  getAdset,
  createAdset,
  updateAdset,
  deleteAdset,
  listCreatives,
  getCreative,
  createCreative,
  deleteCreative,
} = require("../controllers/metaAdsController");

const router = express.Router();

// Every route resolves the active workspace first so lists + writes are scoped.
router.use(workspaceContext());

// ---------------------------------------------------------------------------
// Organic campaigns (existing)
// ---------------------------------------------------------------------------
router.get("/", asyncHandler(listCampaigns));
router.post("/", validate(createCampaignSchema), asyncHandler(createCampaign));
router.get("/:id", asyncHandler(getCampaign));

// ---------------------------------------------------------------------------
// Meta Ads Manager  →  /api/campaigns/meta-ads/*
// ---------------------------------------------------------------------------
const metaAdsRouter = express.Router({ mergeParams: true });

// Ad Accounts
metaAdsRouter.get("/accounts", asyncHandler(getAdAccounts));

// Campaigns CRUD
metaAdsRouter.get("/", asyncHandler(listMetaCampaigns));
metaAdsRouter.post("/", validate(createMetaCampaignSchema), asyncHandler(createMetaCampaign));
metaAdsRouter.get("/:id", asyncHandler(getMetaCampaign));
metaAdsRouter.patch("/:id", validate(updateMetaCampaignSchema), asyncHandler(updateMetaCampaign));
metaAdsRouter.delete("/:id", asyncHandler(deleteMetaCampaign));

// Ad Sets — scoped to a campaign
metaAdsRouter.get("/:campaignId/adsets", asyncHandler(listAdsets));
metaAdsRouter.post("/:campaignId/adsets", validate(createAdsetSchema), asyncHandler(createAdset));
metaAdsRouter.get("/adsets/:adsetId", asyncHandler(getAdset));
metaAdsRouter.patch("/adsets/:adsetId", validate(updateAdsetSchema), asyncHandler(updateAdset));
metaAdsRouter.delete("/adsets/:adsetId", asyncHandler(deleteAdset));

// Ad Creatives
metaAdsRouter.get("/creatives", asyncHandler(listCreatives));
metaAdsRouter.post("/creatives", validate(createCreativeSchema), asyncHandler(createCreative));
metaAdsRouter.get("/creatives/:creativeId", asyncHandler(getCreative));
metaAdsRouter.delete("/creatives/:creativeId", asyncHandler(deleteCreative));

router.use("/meta-ads", metaAdsRouter);

module.exports = router;
