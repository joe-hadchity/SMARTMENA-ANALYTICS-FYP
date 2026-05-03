const express = require("express");

const healthRoutes = require("./healthRoutes");
const workspaceRoutes = require("./workspaceRoutes");
const socialAccountRoutes = require("./socialAccountRoutes");
const socialPostRoutes = require("./socialPostRoutes");
const syncedPostRoutes = require("./syncedPostRoutes");
const syncJobRoutes = require("./syncJobRoutes");
const campaignRoutes = require("./campaignRoutes");
const postRoutes = require("./postRoutes");
const analyzeRoutes = require("./analyzeRoutes");
const predictRoutes = require("./predictRoutes");
const recommendationsRoutes = require("./recommendationsRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const insightsRoutes = require("./insightsRoutes");
const integrationsRoutes = require("./integrationsRoutes");
const assistantRoutes = require("./assistantRoutes");
const reportRoutes = require("./reportRoutes");
const scheduledPostRoutes = require("./scheduledPostRoutes");
const oauthRoutes = require("./oauthRoutes");
const competitorRoutes = require("./competitorRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/workspaces", workspaceRoutes);
router.use("/social-accounts", socialAccountRoutes);
router.use("/social-posts", socialPostRoutes);
router.use("/synced-posts", syncedPostRoutes);
router.use("/sync-jobs", syncJobRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/posts", postRoutes);
router.use("/analyze", analyzeRoutes);
router.use("/predict", predictRoutes);
router.use("/recommendations", recommendationsRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/insights", insightsRoutes);
router.use("/integrations", integrationsRoutes);
router.use("/assistant", assistantRoutes);
router.use("/reports", reportRoutes);
router.use("/scheduled-posts", scheduledPostRoutes);
router.use("/oauth", oauthRoutes);
router.use("/competitors", competitorRoutes);

module.exports = router;
