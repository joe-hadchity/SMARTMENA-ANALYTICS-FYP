/**
 * reportService -- builds the investor-ready Growth Report.
 *
 * Composition:
 *   * Metric aggregate comes from existing analyticsService + dashboardService.
 *   * Narrative (bilingual executive summary + recommended actions) is
 *     produced by Azure OpenAI using systemPrompts.reportNarrative.
 *   * When the LLM is disabled we return a deterministic fallback narrative
 *     so /reports/growth always renders something useful.
 *   * A report can be "shared": a random token is issued in
 *     public.report_shares and served read-only via /api/reports/shared/:token.
 */

const { getSupabase } = require("../config/supabase");
const workspaceService = require("./workspaceService");
const dashboardService = require("./dashboardService");
const analyticsService = require("./analyticsService");
const insightsService = require("./insightsService");
const recommendationService = require("./recommendationService");
const logger = require("../utils/logger");

const {
  chat: llmChat,
  isEnabled: isLLMEnabled,
} = require("./llm/azureOpenAIClient");
const systemPrompts = require("./llm/systemPrompts");
const { withUsageMeter } = require("./llm/usageMeter");

const SHARE_TABLE = "report_shares";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.status = 503;
    throw err;
  }
  return supabase;
}

// ---------------------------------------------------------------------------
// Metric aggregate
// ---------------------------------------------------------------------------

async function collectAggregate(workspaceId) {
  const aggregate = {
    workspace: null,
    totals: null,
    syncJobs: null,
    accountsBreakdown: [],
    overview: null,
    platform: [],
    sentiment: null,
    topPosts: [],
    insights: [],
    recommendations: [],
    warnings: [],
  };

  try {
    const ws = await workspaceService.getWorkspaceById(workspaceId);
    aggregate.workspace = {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      region_default: ws.region_default,
      locale_default: ws.locale_default,
      industry_hint: ws.industry_hint || null,
      primary_region: ws.primary_region || ws.region_default || null,
    };
  } catch (err) {
    aggregate.warnings.push(`workspace:${err.message}`);
  }

  try {
    const summary = await dashboardService.getWorkspaceSummary(workspaceId);
    aggregate.totals = summary.totals;
    aggregate.syncJobs = summary.syncJobs;
    aggregate.accountsBreakdown = summary.accountsBreakdown;
  } catch (err) {
    aggregate.warnings.push(`dashboard:${err.message}`);
  }

  try {
    aggregate.overview = await analyticsService.getOverview(workspaceId);
  } catch (err) {
    aggregate.warnings.push(`overview:${err.message}`);
  }

  try {
    aggregate.platform = await analyticsService.getPlatformBreakdown(workspaceId);
  } catch (err) {
    aggregate.warnings.push(`platform:${err.message}`);
  }

  try {
    aggregate.sentiment = await analyticsService.getSentimentBreakdown(workspaceId);
  } catch (err) {
    aggregate.warnings.push(`sentiment:${err.message}`);
  }

  try {
    aggregate.topPosts = await analyticsService.getTopPosts(workspaceId, {
      limit: 5,
      sortBy: "engagement",
    });
  } catch (err) {
    aggregate.warnings.push(`topPosts:${err.message}`);
  }

  try {
    const insights = await insightsService.listInsightsForWorkspace(workspaceId, {
      limit: 6,
    });
    aggregate.insights = insights.map((i) => ({
      type: i.insight_type,
      title: i.title,
      summary: i.summary,
      severity: i.severity,
    }));
  } catch (err) {
    aggregate.warnings.push(`insights:${err.message}`);
  }

  try {
    const recs = await recommendationService.listRecommendationsForWorkspace(
      workspaceId,
      { limit: 6 },
    );
    aggregate.recommendations = recs.map((r) => ({
      type: r.recommendation_type,
      title: r.title,
      description: r.description,
      priority: r.priority,
    }));
  } catch (err) {
    aggregate.warnings.push(`recommendations:${err.message}`);
  }

  return aggregate;
}

// ---------------------------------------------------------------------------
// Narrative generation
// ---------------------------------------------------------------------------

function fallbackNarrative(aggregate) {
  const totals = aggregate.totals || {};
  const ws = aggregate.workspace?.name || "your workspace";
  const accounts = totals.connectedAccounts || 0;
  const posts = totals.socialPosts || 0;
  const followers = totals.totalFollowers || 0;
  const engagements = totals.totalEngagements || 0;
  const er = totals.avgEngagementRate
    ? (totals.avgEngagementRate * 100).toFixed(2)
    : "—";

  const recs = (aggregate.recommendations || []).slice(0, 3).map((r) => r.title);
  const tipBullets_en = recs.length
    ? recs
    : [
        "Schedule a Reel in the 20:00–22:00 window this week.",
        "Try an Arabic caption for your next product drop.",
        "Respond to the top 10 recent comments within 24 hours.",
      ];

  return {
    executive_summary_en:
      `Over the current window, ${ws} ran ${accounts} connected account(s) ` +
      `with ${posts} synced posts and ${engagements.toLocaleString()} total engagements. ` +
      `Average engagement rate is ${er}%, tracked across ${followers.toLocaleString()} followers. ` +
      `Performance is being measured consistently; the next phase is to lift engagement ` +
      `with MENA-aware content timing and Arabic-first copy where the audience skews local.`,
    executive_summary_ar:
      `خلال الفترة الحالية، شغّلت ${ws} ${accounts} حساب متصل مع ${posts} منشور مُزامن ` +
      `و${engagements.toLocaleString()} تفاعل. متوسط معدل التفاعل ${er}%، موزع على ` +
      `${followers.toLocaleString()} متابع. يتم قياس الأداء بانتظام، والخطوة التالية هي ` +
      `رفع التفاعل من خلال توقيت نشر مراعٍ للسوق العربي ومحتوى باللغة العربية حيث يتطلب الجمهور ذلك.`,
    highlights: [
      {
        label_en: "Accounts",
        label_ar: "الحسابات",
        value: String(accounts),
      },
      {
        label_en: "Synced posts",
        label_ar: "المنشورات المزامنة",
        value: String(posts),
      },
      {
        label_en: "Engagements",
        label_ar: "التفاعلات",
        value: engagements.toLocaleString(),
      },
      {
        label_en: "Engagement rate",
        label_ar: "معدل التفاعل",
        value: `${er}%`,
      },
    ],
    recommended_actions_en: tipBullets_en,
    recommended_actions_ar: tipBullets_en.map((t) =>
      `جرّب: ${t}`,
    ),
    _source: "fallback",
  };
}

async function generateNarrative(workspaceId, aggregate, { locale = "en" } = {}) {
  if (!isLLMEnabled()) {
    return fallbackNarrative(aggregate);
  }

  const systemPrompt = systemPrompts.reportNarrative(aggregate, locale);
  const userPrompt = `Generate the bilingual growth-report narrative JSON now.`;

  try {
    const completion = await withUsageMeter(
      { workspaceId, feature: "report_narrative", metadata: { locale } },
      () =>
        llmChat({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.35,
          maxTokens: 900,
          responseFormat: { type: "json_object" },
        }),
    );
    const parsed = JSON.parse(completion.text);
    return { ...parsed, _source: "llm" };
  } catch (err) {
    logger.warn(
      `reportService: LLM narrative failed, falling back (${err.message})`,
    );
    const fb = fallbackNarrative(aggregate);
    fb._llm_error = err.message;
    return fb;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function generateGrowthReport(workspaceId, { locale = "en" } = {}) {
  const aggregate = await collectAggregate(workspaceId);
  const narrative = await generateNarrative(workspaceId, aggregate, { locale });

  return {
    workspace_id: workspaceId,
    report_type: "growth",
    locale,
    generated_at: new Date().toISOString(),
    aggregate,
    narrative,
  };
}

async function shareReport(workspaceId, { locale = "en", expiresInDays } = {}) {
  const supabase = requireClient();
  // Snapshot the report right now so the public page is stable.
  const snapshot = await generateGrowthReport(workspaceId, { locale });

  const expiresAt =
    Number.isFinite(Number(expiresInDays)) && expiresInDays > 0
      ? new Date(Date.now() + Number(expiresInDays) * 86400_000).toISOString()
      : null;

  const { data, error } = await supabase
    .from(SHARE_TABLE)
    .insert({
      workspace_id: workspaceId,
      report_type: "growth",
      locale,
      data_snapshot_json: snapshot,
      expires_at: expiresAt,
    })
    .select("id, token, created_at, expires_at, locale, report_type")
    .single();

  if (error) {
    // 42P01 = table missing
    if (error.code === "42P01") {
      const err = new Error(
        "report_shares table missing. Apply backend/db/schema_v7.sql to enable sharing.",
      );
      err.status = 503;
      err.code = "SCHEMA_MISSING";
      throw err;
    }
    const err = new Error(error.message || "Failed to create share link");
    err.status = 400;
    throw err;
  }
  return data;
}

async function getSharedReport(token) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(SHARE_TABLE)
    .select("*")
    .eq("token", token)
    .eq("revoked", false)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      const err = new Error("Sharing is not enabled yet (schema_v7 missing).");
      err.status = 503;
      throw err;
    }
    const err = new Error(error.message || "Failed to load shared report");
    err.status = 400;
    throw err;
  }

  if (!data) {
    const err = new Error("Shared report not found or has been revoked.");
    err.status = 404;
    throw err;
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    const err = new Error("Shared report has expired.");
    err.status = 410;
    throw err;
  }

  return {
    token: data.token,
    report_type: data.report_type,
    locale: data.locale,
    created_at: data.created_at,
    expires_at: data.expires_at,
    report: data.data_snapshot_json,
  };
}

async function revokeShare(workspaceId, shareId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(SHARE_TABLE)
    .update({ revoked: true })
    .eq("id", shareId)
    .eq("workspace_id", workspaceId)
    .select("id, revoked")
    .maybeSingle();
  if (error) {
    const err = new Error(error.message || "Failed to revoke share");
    err.status = 400;
    throw err;
  }
  if (!data) {
    const err = new Error("Share not found");
    err.status = 404;
    throw err;
  }
  return data;
}

async function listShares(workspaceId) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(SHARE_TABLE)
    .select("id, token, report_type, locale, created_at, expires_at, revoked")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    if (error.code === "42P01") return [];
    const err = new Error(error.message || "Failed to list shares");
    err.status = 400;
    throw err;
  }
  return data || [];
}

module.exports = {
  generateGrowthReport,
  shareReport,
  getSharedReport,
  revokeShare,
  listShares,
};
