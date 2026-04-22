/**
 * demoBootstrapService -- turns any workspace into a rich, believable
 * MENA demo in one call.
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
 *   - Degrades gracefully when optional tables (insights, recommendations,
 *     content_scores) are not yet migrated; the core (accounts + posts +
 *     metrics) still lands.
 */

const workspaceService = require("./workspaceService");
const socialAccountService = require("./socialAccountService");
const syncService = require("./syncService");
const insightsService = require("./insightsService");
const recommendationService = require("./recommendationService");
const logger = require("../utils/logger");
const db = require("./dbService");

// -----------------------------------------------------------------------------
// Curated demo "personas" — enough variety to see the dashboard light up.
// -----------------------------------------------------------------------------
const DEMO_ACCOUNTS = [
  {
    kind: "instagram",
    handle: "mena_kitchen_demo",
    displayName: "Mena Kitchen (Demo)",
    limit: 24,
    daysBack: 45,
  },
  {
    kind: "facebook",
    handle: "mena.kitchen.demo",
    displayName: "Mena Kitchen FB (Demo)",
    limit: 18,
    daysBack: 45,
  },
];

// Bilingual seed recommendations to land on the dashboard right away so
// /api/workspaces/:id/recommendations isn't empty the first second.
const DEMO_RECOMMENDATIONS = [
  {
    recommendation_type: "posting_time",
    title: "Post after Iftar during Ramadan",
    description:
      "Engagement in the UAE peaks between 21:00 and 23:00 during Ramadan. Schedule reels accordingly.",
    priority: "high",
    data: { window: { start: 21, end: 23 }, reason: "ramadan_after_iftar" },
  },
  {
    recommendation_type: "content",
    title: "Mix Khaleeji Arabic with English hooks",
    description:
      "Posts that start with a short Khaleeji Arabic line and end with an English CTA outperform single-language posts by ~18%.",
    priority: "medium",
    data: { language_mix: "ar_primary_en_hook" },
  },
  {
    recommendation_type: "mena_event",
    title: "UAE National Day (2 December) is approaching",
    description:
      "Plan 3 posts around UAE National Day: a teaser one week before, a patriotic reel on the day, and a thank-you carousel.",
    priority: "high",
    data: { event: "uae_national_day", country_code: "AE" },
  },
];

// A handful of sample captions scored by the content engine already, so the
// Caption Studio history and content_scores table are not empty.
const DEMO_CONTENT_SCORES = [
  {
    platform: "meta_instagram",
    caption_text:
      "عرض اليوم فقط: كل وجبة بنصف السعر بعد الساعة ٩ مساءً 🍔 اطلب الآن.",
    predicted_sentiment: "positive",
    predicted_roi: 9.87,
    confidence_score: 0.72,
    recommendation_text:
      "Short Arabic caption with a clear CTA. Post between 20:00–22:00 UAE time for best engagement.",
  },
  {
    platform: "meta_instagram",
    caption_text:
      "Treat yourself tonight — our new dessert box drops at 8pm. Limited stock.",
    predicted_sentiment: "positive",
    predicted_roi: 7.41,
    confidence_score: 0.68,
    recommendation_text:
      "English-first caption. Mirror with an Arabic version for KSA audiences to lift reach by ~15%.",
  },
  {
    platform: "meta_facebook",
    caption_text:
      "نحن نوظف! فرصة لمدير تسويق رقمي في فريقنا بدبي. التفاصيل بالتعليقات.",
    predicted_sentiment: "neutral",
    predicted_roi: 4.12,
    confidence_score: 0.55,
    recommendation_text:
      "Hiring posts perform better as carousels with photo of the team. Pin the post for 48h.",
  },
];

/**
 * Ensure the given workspace has at least `N` connected mock accounts,
 * a recent sync for each, and the AI-layer tables seeded.
 *
 * Returns a summary the controller can return verbatim.
 */
async function bootstrapDemoWorkspace(workspaceId) {
  // 1. Existence check (404 via dbService.getById).
  const workspace = await workspaceService.getWorkspaceById(workspaceId);

  const summary = {
    workspaceId,
    workspaceName: workspace.name,
    accountsConnected: [],
    postsSynced: 0,
    metricsRecorded: 0,
    insightsGenerated: 0,
    recommendationsInserted: 0,
    contentScoresInserted: 0,
    warnings: [],
  };

  // 2. Opt-in: set brand voice defaults if the workspace hasn't defined any.
  try {
    const existingVoice = await workspaceService.getBrandVoice(workspaceId);
    const hasVoice =
      (existingVoice.brand_voice?.tone_keywords?.length || 0) > 0 ||
      (existingVoice.brand_voice?.sample_phrases?.length || 0) > 0;

    if (!hasVoice) {
      await workspaceService.upsertBrandVoice(workspaceId, {
        industry_hint: existingVoice.industry_hint || "food_and_beverage",
        primary_region: existingVoice.primary_region || "AE",
        brand_voice: {
          tone_keywords: ["playful", "warm", "local", "snackable"],
          do: [
            "Keep sentences short",
            "Mention local landmarks (Dubai, Jeddah)",
            "Use food emojis sparingly",
          ],
          dont: [
            "No slang",
            "No political references",
            "Avoid generic stock-phrase English",
          ],
          sample_phrases: [
            "مذاقنا يشبه ذكريات الطفولة.",
            "Late-night craving? We got you.",
            "طعم محلي… بشخصية عالمية.",
          ],
          default_dialect: "khaleeji",
        },
      });
    }
  } catch (err) {
    summary.warnings.push(`brand_voice_default_skipped: ${err.message}`);
  }

  // 3. Connect mock Meta accounts + sync each.
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

  // 4. AI insights — reuse the existing rule-based generator.
  try {
    const insights = await insightsService.generateForWorkspace(workspaceId);
    summary.insightsGenerated = insights.length;
  } catch (err) {
    summary.warnings.push(`insights_generation_skipped: ${err.message}`);
  }

  // 5. Recommendations (persisted).
  try {
    const insertedRecs = await recommendationService.createRecommendationsForWorkspace(
      workspaceId,
      DEMO_RECOMMENDATIONS,
    );
    summary.recommendationsInserted = insertedRecs.length;
  } catch (err) {
    summary.warnings.push(`recommendations_skipped: ${err.message}`);
  }

  // 6. Content scores (direct DB insert — no ML call, so seeding works even
  //    when the ML service is offline).
  try {
    const rows = DEMO_CONTENT_SCORES.map((c) => ({
      workspace_id: workspaceId,
      platform: c.platform,
      caption_text: c.caption_text,
      predicted_sentiment: c.predicted_sentiment,
      predicted_roi: c.predicted_roi,
      confidence_score: c.confidence_score,
      recommendation_text: c.recommendation_text,
      data: { source: "demo_bootstrap" },
    }));
    const inserted = await db.insertMany("content_scores", rows);
    summary.contentScoresInserted = inserted.length;
  } catch (err) {
    summary.warnings.push(`content_scores_skipped: ${err.message}`);
  }

  logger.info(
    `demo-bootstrap: workspace=${workspaceId} accounts=${summary.accountsConnected.length} posts=${summary.postsSynced} insights=${summary.insightsGenerated} recs=${summary.recommendationsInserted} scores=${summary.contentScoresInserted}`,
  );

  return summary;
}

module.exports = { bootstrapDemoWorkspace };
