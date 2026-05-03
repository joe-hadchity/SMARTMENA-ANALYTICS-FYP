/**
 * demoBootstrapService -- turns any workspace into a rich, believable
 * Born2Hike-style MENA demo in one call.
 *
 * Used by:
 *   - POST /api/workspaces/demo-bootstrap        (UI "Try with demo data")
 *   - scripts/seed-demo-workspace.js             (CLI one-shot seeder)
 *
 * Contract:
 *   - Idempotent-ish: re-running against the same workspace is safe. Social
 *     accounts use deterministic external_account_id (mock provider), and
 *     synced_posts upsert on (workspace_id, social_account_id, external_post_id).
 *   - Additive: never deletes existing rows.
 *   - Degrades gracefully when optional tables (insights, recommendations) are
 *     not yet migrated; the core (accounts + posts + metrics) still lands.
 */

const workspaceService = require("./workspaceService");
const socialAccountService = require("./socialAccountService");
const syncService = require("./syncService");
const insightsService = require("./insightsService");
const recommendationService = require("./recommendationService");
const logger = require("../utils/logger");

const DEMO_ACCOUNTS = [
  {
    kind: "instagram",
    handle: "born2hike",
    displayName: "Born2Hike",
    limit: 24,
    daysBack: 45,
  },
  {
    kind: "facebook",
    handle: "born2hike.lebanon",
    displayName: "Born2Hike Lebanon",
    limit: 18,
    daysBack: 45,
  },
];

const DEMO_RECOMMENDATIONS = [
  {
    recommendation_type: "content_format",
    title: "Prioritize short group-hike reels",
    description:
      "Local outdoor audiences respond well to short reels that show the trail, the group, and a clear joining CTA.",
    priority: "high",
    data: { format: "reel", reason: "group_participation_signal" },
  },
  {
    recommendation_type: "caption",
    title: "Use weekend escape caption hooks",
    description:
      "Lead with the trail/location, keep the caption practical, and end with an action such as save, DM, or join the next hike.",
    priority: "medium",
    data: { caption_pattern: "location_first_cta" },
  },
  {
    recommendation_type: "campaign_theme",
    title: "Build a waterfall and sunset hike series",
    description:
      "Seasonal Lebanon hikes around waterfalls, cedars, sunset viewpoints, and weekend escapes give the demo stronger local relevance.",
    priority: "high",
    data: { themes: ["waterfall hikes", "sunset trails", "weekend escapes"] },
  },
];

async function bootstrapDemoWorkspace(workspaceId) {
  const workspace = await workspaceService.getWorkspaceById(workspaceId);

  const summary = {
    workspaceId,
    workspaceName: workspace.name,
    accountsConnected: [],
    postsSynced: 0,
    metricsRecorded: 0,
    insightsGenerated: 0,
    recommendationsInserted: 0,
    warnings: [],
  };

  try {
    const existingVoice = await workspaceService.getBrandVoice(workspaceId);
    const hasVoice =
      (existingVoice.brand_voice?.tone_keywords?.length || 0) > 0 ||
      (existingVoice.brand_voice?.sample_phrases?.length || 0) > 0;

    if (!hasVoice) {
      await workspaceService.upsertBrandVoice(workspaceId, {
        industry_hint: existingVoice.industry_hint || "outdoor_travel",
        primary_region: existingVoice.primary_region || "LB",
        brand_voice: {
          tone_keywords: ["adventurous", "local", "community", "safe"],
          do: [
            "Mention Lebanon trails and landmarks",
            "Show group participation and safety",
            "Use clear CTAs for joining hikes",
          ],
          dont: [
            "Do not exaggerate trail difficulty",
            "No political references",
            "Avoid generic travel captions",
          ],
          sample_phrases: [
            "Weekend trail reset with the Born2Hike crew.",
            "Save this route for your next Lebanon mountain escape.",
            "Join the group, bring water, and leave only footprints.",
          ],
          default_dialect: "levantine",
        },
      });
    }
  } catch (err) {
    summary.warnings.push(`brand_voice_default_skipped: ${err.message}`);
  }

  for (const spec of DEMO_ACCOUNTS) {
    try {
      const account = await socialAccountService.connectMetaAccount({
        workspaceId,
        kind: spec.kind,
        handle: spec.handle,
        displayName: spec.displayName,
      });

      const syncResult = await syncService.syncAccount(account.id, {
        limit: spec.limit,
        daysBack: spec.daysBack,
      });

      summary.accountsConnected.push({
        id: account.id,
        provider: account.provider,
        handle: account.handle,
      });
      summary.postsSynced += syncResult.postsSynced;
      summary.metricsRecorded += syncResult.metricsRecorded;
    } catch (err) {
      logger.warn(`demo: failed to seed account ${spec.handle}: ${err.message}`);
      summary.warnings.push(
        `account_seed_failed:${spec.handle}:${err.message}`,
      );
    }
  }

  try {
    const insights = await insightsService.generateForWorkspace(workspaceId);
    summary.insightsGenerated = insights.length;
  } catch (err) {
    summary.warnings.push(`insights_generation_skipped: ${err.message}`);
  }

  try {
    const insertedRecs = await recommendationService.createRecommendationsForWorkspace(
      workspaceId,
      DEMO_RECOMMENDATIONS,
    );
    summary.recommendationsInserted = insertedRecs.length;
  } catch (err) {
    summary.warnings.push(`recommendations_skipped: ${err.message}`);
  }

  logger.info(
    `demo-bootstrap: workspace=${workspaceId} accounts=${summary.accountsConnected.length} posts=${summary.postsSynced} insights=${summary.insightsGenerated} recs=${summary.recommendationsInserted}`,
  );

  return summary;
}

module.exports = { bootstrapDemoWorkspace };
