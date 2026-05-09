/**
 * insightsService -- generates bilingual, MENA-aware product insights by
 * joining signals from synced_posts + post_metrics + sentiment_results +
 * campaigns + the static MENA calendar.
 *
 * Most baseline insights are deterministic rules. When Azure OpenAI is
 * configured, `generateForWorkspace` also appends evidence-grounded AI
 * suggestions built from the same real analytics snapshot. The LLM is only
 * allowed to explain and connect existing signals, not invent new metrics.
 *
 * NormalizedInsight = {
 *   insight_type, scope_type, scope_id?,
 *   title_ar, title_en, body_ar, body_en,
 *   severity, confidence, data, model_version
 * }
 */

const db = require("./dbService");
const analyticsService = require("./analyticsService");
const recommendationsService = require("./recommendationsService");
const menaEngine = require("./menaRecommendationEngine");
const { getSupabase } = require("../config/supabase");
const env = require("../config/env");
const logger = require("../utils/logger");
const {
  chat,
  isEnabled: isLLMEnabled,
  LLMDisabledError,
} = require("./llm/azureOpenAIClient");
const systemPrompts = require("./llm/systemPrompts");
const { assertBudget, recordUsage } = require("./llm/usageMeter");

const TABLE = "ai_insights";
const MODEL_VERSION = "insights-rules-v1";
const LLM_MODEL_VERSION = "azure-openai-insights-v1";

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
// Read / list
// ---------------------------------------------------------------------------

async function listInsights({ workspaceId, scopeType, insightType, severity, limit = 100 }) {
  const supabase = requireClient();
  let q = supabase
    .from(TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (scopeType) q = q.eq("scope_type", scopeType);
  if (insightType) q = q.eq("insight_type", insightType);
  if (severity) q = q.eq("severity", severity);

  const { data, error } = await q;
  if (error) {
    const err = new Error(error.message || "Failed to list insights");
    err.status = 400;
    err.details = { code: error.code };
    throw err;
  }
  return data || [];
}

/**
 * Flatten the bilingual ai_insights row into the startup-friendly shape
 * (title / summary / source / created_at). If schema_v5 `title`/`summary`/
 * `source`/`created_at` columns are present they win; otherwise we fall
 * back to the bilingual `title_en`/`title_ar`, `body_en`/`body_ar`,
 * `model_version`, and `generated_at` columns.
 */
function projectInsightFlat(row) {
  if (!row) return row;
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    insight_type: row.insight_type,
    title: row.title ?? row.title_en ?? row.title_ar ?? null,
    summary: row.summary ?? row.body_en ?? row.body_ar ?? null,
    severity: row.severity,
    source: row.source ?? row.model_version ?? null,
    confidence: row.confidence,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    data: row.data,
    created_at: row.created_at ?? row.generated_at,
  };
}

/**
 * Map an insight row + workspace region to the engine's context shape.
 * Each insight_type has its own extractors because `row.data` is
 * produced by different generators above.
 */
function contextForInsight(row, { region } = {}) {
  const base = { region, platform: "instagram" };
  const data = row.data || {};

  switch (row.insight_type) {
    case "sentiment_summary": {
      const shares = data.shares || {};
      const dominant =
        (shares.positive ?? 0) >= (shares.negative ?? 0) &&
        (shares.positive ?? 0) >= (shares.neutral ?? 0)
          ? "positive"
          : (shares.negative ?? 0) >= (shares.neutral ?? 0)
            ? "negative"
            : "neutral";
      return {
        ...base,
        contentTone: dominant,
        toneConfidence: data.avgConfidence,
      };
    }
    case "performance_anomaly": {
      const eng = Number(data.engagement);
      const mean = Number(data.mean);
      const engagementRatio =
        Number.isFinite(eng) && Number.isFinite(mean) && mean > 0
          ? eng / mean
          : null;
      return { ...base, engagementRatio };
    }
    case "content_recommendation": {
      const winner = Array.isArray(data.ranking) ? data.ranking[0] : null;
      return {
        ...base,
        contentType: winner ? winner.postType : null,
        languageMix:
          winner && winner.captionLang === "ar"
            ? "arabic"
            : winner && winner.captionLang === "en"
              ? "english"
              : winner && winner.captionLang === "mixed"
                ? "mixed"
                : null,
      };
    }
    case "best_posting_time": {
      const hour = data.top && Number(data.top.hour);
      return {
        ...base,
        postingHour: Number.isFinite(hour) ? hour : null,
      };
    }
    case "mena_trend": {
      return { ...base, event: data.event };
    }
    default:
      return base;
  }
}

/**
 * Attach a short, practical MENA-tailored tip (bilingual) to every
 * returned insight row. Uses the shared menaRecommendationEngine.
 */
function enrichInsightWithTip(row, { region } = {}) {
  const flat = projectInsightFlat(row);
  try {
    const ctx = contextForInsight(row, { region });
    const tips = menaEngine.generateRecommendations(ctx);
    const top = tips[0] || null;
    return {
      ...flat,
      tip_en: top ? top.en : null,
      tip_ar: top ? top.ar : null,
      tip_dimension: top ? top.dimension : null,
    };
  } catch {
    return { ...flat, tip_en: null, tip_ar: null, tip_dimension: null };
  }
}

async function listInsightsForWorkspace(
  workspaceId,
  { insightType, severity, source, limit } = {},
) {
  const supabase = requireClient();

  // Resolve the workspace region once so every tip is region-aware.
  // We tolerate the workspace lookup failing (e.g. bad id) by falling
  // back to a null region -- the engine handles that gracefully.
  let region = null;
  try {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("region_default")
      .eq("id", workspaceId)
      .maybeSingle();
    if (ws && ws.region_default) region = ws.region_default;
  } catch {
    // Non-fatal.
  }

  let q = supabase
    .from(TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("generated_at", { ascending: false });

  if (insightType) q = q.eq("insight_type", insightType);
  if (severity) q = q.eq("severity", severity);
  if (source) q = q.eq("source", source);
  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error) {
    // Most likely case: schema_v5 hasn't been applied yet and the `source`
    // column is missing. Retry once without the column-level filter and
    // let the caller see the subset of data that does exist.
    if (source) {
      return listInsightsForWorkspace(workspaceId, {
        insightType,
        severity,
        limit,
      });
    }
    const err = new Error(error.message || "Failed to list insights");
    err.status = 400;
    err.details = { code: error.code };
    throw err;
  }
  return (data || []).map((row) => enrichInsightWithTip(row, { region }));
}

// ---------------------------------------------------------------------------
// Generators (each returns an array of NormalizedInsight)
// ---------------------------------------------------------------------------

async function generateSentimentSummary(workspaceId) {
  const breakdown = await analyticsService.getSentimentBreakdown(workspaceId);
  if (!breakdown.total) return [];

  const positivePct = Math.round(breakdown.shares.positive * 100);
  const negativePct = Math.round(breakdown.shares.negative * 100);
  const neutralPct = Math.round(breakdown.shares.neutral * 100);

  const dominant =
    positivePct >= negativePct && positivePct >= neutralPct
      ? "positive"
      : negativePct >= neutralPct
        ? "negative"
        : "neutral";

  const severity =
    dominant === "negative" && negativePct >= 40
      ? "warning"
      : dominant === "positive" && positivePct >= 55
        ? "opportunity"
        : "info";

  return [
    {
      insight_type: "sentiment_summary",
      scope_type: "workspace",
      scope_id: null,
      title_en: "Audience sentiment overview",
      title_ar: "نظرة عامة على مشاعر الجمهور",
      body_en: `Out of ${breakdown.total} analysed posts, ${positivePct}% are positive, ${neutralPct}% neutral, and ${negativePct}% negative. Sentiment skews ${dominant}.`,
      body_ar: `من أصل ${breakdown.total} منشور تم تحليله، ${positivePct}% إيجابي و${neutralPct}% محايد و${negativePct}% سلبي. يميل الشعور العام نحو الـ${
        dominant === "positive" ? "إيجابي" : dominant === "negative" ? "سلبي" : "محايد"
      }.`,
      severity,
      confidence: Number((breakdown.avgConfidence ?? 0.7).toFixed(4)),
      data: breakdown,
      model_version: MODEL_VERSION,
    },
  ];
}

async function generatePerformanceAnomalies(workspaceId) {
  const top = await analyticsService.getTopPosts(workspaceId, { limit: 50, sortBy: "engagement" });
  if (top.length < 5) return [];

  const scores = top.map((p) => p.engagement || 0).filter((v) => v > 0);
  if (scores.length === 0) return [];

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdev =
    Math.sqrt(
      scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length,
    ) || 1;

  const insights = [];

  // Outperformers (>= mean + 1.5 stdev, capped to 3).
  const winners = top
    .filter((p) => (p.engagement || 0) >= mean + 1.5 * stdev)
    .slice(0, 3);

  for (const p of winners) {
    const engagement = p.engagement || 0;
    const multiple = (engagement / mean).toFixed(1);
    insights.push({
      insight_type: "performance_anomaly",
      scope_type: "synced_post",
      scope_id: p.id,
      title_en: `Outlier: post performing ${multiple}x average`,
      title_ar: `منشور متميز يحقق ${multiple} ضعف المتوسط`,
      body_en: `A ${p.post_type || "post"} in ${p.caption_lang || "ar"} drove ${engagement.toLocaleString()} interactions — well above the ${Math.round(mean).toLocaleString()} average. Consider boosting it or re-using the creative angle.`,
      body_ar: `منشور من نوع ${p.post_type || "منشور"} (${p.caption_lang || "ar"}) حقق ${engagement.toLocaleString()} تفاعل — أعلى بكثير من المتوسط (${Math.round(mean).toLocaleString()}). فكّر في تمويله أو إعادة استخدام الفكرة الإبداعية.`,
      severity: "opportunity",
      confidence: 0.8,
      data: { postId: p.id, engagement, mean: Math.round(mean), stdev: Math.round(stdev) },
      model_version: MODEL_VERSION,
    });
  }

  // Underperformers (<= mean - 1.0 stdev and non-zero), capped to 2.
  const losers = top
    .filter((p) => (p.engagement || 0) > 0 && (p.engagement || 0) <= mean - stdev)
    .slice(-2);

  for (const p of losers) {
    insights.push({
      insight_type: "performance_anomaly",
      scope_type: "synced_post",
      scope_id: p.id,
      title_en: "Underperforming post detected",
      title_ar: "منشور أداؤه أقل من المتوقع",
      body_en: `This ${p.post_type || "post"} is pulling in noticeably fewer interactions than your baseline. Consider revisiting the hook, media, or posting time.`,
      body_ar: `منشور ${p.post_type || ""} يحقق تفاعلاً أقل بوضوح من المعتاد. فكّر في إعادة صياغة الجملة الافتتاحية أو تغيير توقيت النشر.`,
      severity: "warning",
      confidence: 0.7,
      data: { postId: p.id, engagement: p.engagement || 0, mean: Math.round(mean) },
      model_version: MODEL_VERSION,
    });
  }

  return insights;
}

async function generateContentRecommendations(workspaceId) {
  const top = await analyticsService.getTopPosts(workspaceId, {
    limit: 100,
    sortBy: "engagement",
  });
  if (top.length < 3) return [];

  // Aggregate by (post_type, caption_lang).
  const bucket = new Map();
  for (const p of top) {
    const key = `${p.post_type || "unknown"}|${p.caption_lang || "unknown"}`;
    if (!bucket.has(key)) {
      bucket.set(key, {
        postType: p.post_type || "unknown",
        captionLang: p.caption_lang || "unknown",
        count: 0,
        engagement: 0,
      });
    }
    const b = bucket.get(key);
    b.count += 1;
    b.engagement += p.engagement || 0;
  }

  const sorted = Array.from(bucket.values())
    .map((b) => ({ ...b, avgEngagement: b.engagement / b.count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  const winner = sorted[0];
  if (!winner || winner.count < 2) return [];

  const langWord = {
    ar: { en: "Arabic", ar: "عربي" },
    en: { en: "English", ar: "إنجليزي" },
    mixed: { en: "bilingual", ar: "ثنائي اللغة" },
  };
  const lang = langWord[winner.captionLang] || { en: winner.captionLang, ar: winner.captionLang };

  return [
    {
      insight_type: "content_recommendation",
      scope_type: "workspace",
      scope_id: null,
      title_en: `Double down on ${lang.en} ${winner.postType}s`,
      title_ar: `ركّز أكثر على ${winner.postType} بـ${lang.ar}`,
      body_en: `${lang.en} ${winner.postType} content is averaging ${Math.round(winner.avgEngagement).toLocaleString()} interactions per post across ${winner.count} samples — your strongest format right now.`,
      body_ar: `محتوى ${winner.postType} بـ${lang.ar} يحقق متوسط ${Math.round(winner.avgEngagement).toLocaleString()} تفاعل لكل منشور عبر ${winner.count} عينة — أقوى صيغة لديك حالياً.`,
      severity: "opportunity",
      confidence: 0.75,
      data: { ranking: sorted.slice(0, 5) },
      model_version: MODEL_VERSION,
    },
  ];
}

async function generateBestPostingTime(workspaceId) {
  const supabase = requireClient();

  // Pull posted_at + latest metrics snapshot for each post in workspace.
  const { data: posts, error } = await supabase
    .from("synced_posts")
    .select("id, posted_at")
    .eq("workspace_id", workspaceId)
    .not("posted_at", "is", null)
    .limit(1000);
  if (error) {
    const err = new Error(error.message || "Failed to read posts for timing");
    err.status = 400;
    throw err;
  }
  if (!posts || posts.length < 5) return [];

  const ids = posts.map((p) => p.id);
  const { data: metrics, error: metricsErr } = await supabase
    .from("post_metrics")
    .select("synced_post_id, likes, comments, shares, saves, engagement_rate, captured_at")
    .in("synced_post_id", ids)
    .limit(20000);
  if (metricsErr) {
    const err = new Error(metricsErr.message || "Failed to read metrics for timing");
    err.status = 400;
    throw err;
  }

  // Keep latest metric per post.
  const latest = new Map();
  for (const m of metrics || []) {
    const prev = latest.get(m.synced_post_id);
    if (!prev || new Date(m.captured_at) > new Date(prev.captured_at)) {
      latest.set(m.synced_post_id, m);
    }
  }

  // Bucket by hour-of-day, sum engagement.
  const hourly = Array.from({ length: 24 }, () => ({ engagement: 0, samples: 0 }));
  for (const p of posts) {
    const m = latest.get(p.id);
    if (!m) continue;
    const hour = new Date(p.posted_at).getUTCHours();
    const eng = (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);
    hourly[hour].engagement += eng;
    hourly[hour].samples += 1;
  }

  const hourlyAvg = hourly.map((b, h) => ({
    hour: h,
    avgEngagement: b.samples > 0 ? b.engagement / b.samples : 0,
    samples: b.samples,
  }));

  const best = hourlyAvg
    .filter((b) => b.samples > 0)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

  if (!best || best.avgEngagement === 0) return [];

  return [
    {
      insight_type: "best_posting_time",
      scope_type: "workspace",
      scope_id: null,
      title_en: `Posts go further around ${best.hour}:00 UTC`,
      title_ar: `منشوراتك تتفوق حوالي الساعة ${best.hour}:00 بالتوقيت العالمي`,
      body_en: `Your engagement peaks for posts published around ${best.hour}:00 UTC (average ${Math.round(best.avgEngagement).toLocaleString()} interactions across ${best.samples} samples). Convert to local time for your region.`,
      body_ar: `يصل التفاعل إلى ذروته عند النشر حوالي الساعة ${best.hour}:00 بالتوقيت العالمي (بمتوسط ${Math.round(best.avgEngagement).toLocaleString()} تفاعل عبر ${best.samples} عينة). اضبط التوقيت المحلي لمنطقتك.`,
      severity: "info",
      confidence: 0.7,
      data: { hourly: hourlyAvg, top: best },
      model_version: MODEL_VERSION,
    },
  ];
}

async function generateMenaTrend(workspaceId) {
  // Pick the workspace's region_default (if any) to scope the event search.
  const supabase = requireClient();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, region_default")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) {
    const err = new Error(error.message || "Failed to read workspace");
    err.status = 400;
    throw err;
  }
  const region = (workspace && workspace.region_default) || "AE";

  const event = recommendationsService.findNearestEvent(region);
  if (!event) return [];

  const distance = event.distanceDays;
  let severity = "info";
  if (distance >= 0 && distance <= 14) severity = "opportunity";
  if (distance < 0) severity = "info";

  return [
    {
      insight_type: "mena_trend",
      scope_type: "workspace",
      scope_id: null,
      title_en:
        distance > 0
          ? `${event.name_en} is in ${distance} day(s) — plan ahead`
          : distance === 0
            ? `${event.name_en} is live today`
            : `${event.name_en} just passed`,
      title_ar:
        distance > 0
          ? `${event.name_ar} بعد ${distance} يوم — خطط مسبقاً`
          : distance === 0
            ? `${event.name_ar} اليوم`
            : `${event.name_ar} انتهى للتو`,
      body_en: event.notes_en,
      body_ar: event.notes_ar,
      severity,
      confidence: 0.9,
      data: { region, event },
      model_version: MODEL_VERSION,
    },
  ];
}

function extractJsonObject(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function compactPost(p) {
  if (!p) return null;
  return {
    id: p.id,
    type: p.post_type || p.media_type || null,
    caption: p.caption ? String(p.caption).slice(0, 220) : null,
    posted_at: p.posted_at || p.published_at || null,
    engagement: p.engagement || 0,
    score: p.score || 0,
    latest_metrics: p.latest_metrics
      ? {
          likes: p.latest_metrics.likes || 0,
          comments: p.latest_metrics.comments || 0,
          shares: p.latest_metrics.shares || 0,
          saves: p.latest_metrics.saves || 0,
          reach: p.latest_metrics.reach || 0,
          impressions: p.latest_metrics.impressions || 0,
          engagement_rate: p.latest_metrics.engagement_rate ?? null,
        }
      : null,
  };
}

async function buildLLMInsightContext(workspaceId) {
  const supabase = requireClient();

  const [workspaceRes, overview, sentiment, platform, topPosts] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name, region_default, locale_default, industry_hint, primary_region")
      .eq("id", workspaceId)
      .maybeSingle(),
    analyticsService.getOverview(workspaceId).catch(() => null),
    analyticsService.getSentimentBreakdown(workspaceId).catch(() => null),
    analyticsService.getPlatformBreakdown(workspaceId).catch(() => []),
    analyticsService.getTopPosts(workspaceId, { limit: 8, sortBy: "engagement" }).catch(() => []),
  ]);

  let competitor = null;
  try {
    const competitorService = require("./competitors/competitorService");
    const comparison = await competitorService.comparison(workspaceId, { window_days: 30 });
    competitor = {
      approved_count: comparison?.competitors_summary?.competitor_count || 0,
      accounts_with_posts: comparison?.competitors_summary?.accounts_with_posts || 0,
      best_competitor_handle: comparison?.competitors_summary?.best_competitor_handle || null,
      avg_engagement_rate: comparison?.competitors_summary?.avg_engagement_rate ?? null,
      warnings: comparison?.warnings || [],
      recommendations: (comparison?.recommendations || []).slice(0, 3),
    };
  } catch (err) {
    competitor = { unavailable: true, reason: err?.message || "competitor comparison unavailable" };
  }

  return {
    workspace: workspaceRes.data || null,
    overview,
    sentiment,
    platform: (platform || []).slice(0, 6),
    top_posts: (topPosts || []).slice(0, 6).map(compactPost).filter(Boolean),
    competitor,
    data_rules: {
      no_hallucinated_metrics: true,
      use_only_values_in_snapshot: true,
      if_data_is_missing_recommend_next_connection_step: true,
    },
  };
}

function normalizeLLMInsightSuggestion(item, index) {
  const severity = ["info", "warning", "opportunity"].includes(item?.severity)
    ? item.severity
    : "info";
  const confidence = Number(item?.confidence);
  const boundedConfidence =
    Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.65;
  const evidence = Array.isArray(item?.evidence)
    ? item.evidence.map((v) => String(v).trim()).filter(Boolean).slice(0, 6)
    : [];

  const titleEn = String(item?.title_en || item?.title || "").trim();
  const bodyEn = String(item?.body_en || item?.body || "").trim();
  if (!titleEn || !bodyEn || evidence.length === 0) return null;

  return {
    insight_type: "content_recommendation",
    scope_type: "workspace",
    scope_id: null,
    title_en: titleEn.slice(0, 180),
    title_ar: String(item?.title_ar || titleEn).trim().slice(0, 180),
    body_en: bodyEn.slice(0, 900),
    body_ar: String(item?.body_ar || bodyEn).trim().slice(0, 900),
    severity,
    confidence: Number(boundedConfidence.toFixed(4)),
    data: {
      source: "azure_openai",
      prompt_version: systemPrompts.PROMPT_VERSION,
      evidence,
      rank: index + 1,
    },
    model_version: `${LLM_MODEL_VERSION}:${env.AZURE_OPENAI_DEPLOYMENT || "unknown"}`,
  };
}

async function generateAzureInsightSuggestions(workspaceId) {
  if (!isLLMEnabled()) return [];

  try {
    await assertBudget(workspaceId);
  } catch (err) {
    if (err.code === "LLM_BUDGET_EXCEEDED") throw err;
    logger.warn(`insights: budget check failed (${err.message})`);
  }

  const context = await buildLLMInsightContext(workspaceId);
  const compactContext = {
    workspace: context.workspace,
    overview: context.overview,
    sentiment: context.sentiment,
    platform: context.platform,
    top_posts: context.top_posts,
    competitor: context.competitor,
  };
  const messages = [
    {
      role: "system",
      content:
        "You are SmartMENA's AI campaign analyst. Return strict JSON only with key suggestions. Use only the provided data; never invent metrics. Each suggestion must include concrete evidence strings.",
    },
    {
      role: "user",
      content: `Return JSON in this exact shape: {"suggestions":[{"title_en":"...","body_en":"...","title_ar":"...","body_ar":"...","severity":"info|warning|opportunity","confidence":0.7,"evidence":["..."]}]}. Create 1-3 practical suggestions for this workspace from this data: ${JSON.stringify(compactContext)}`,
    },
  ];

  let result;
  try {
    result = await chat({
      messages,
      maxTokens: 4000,
      temperature: 0.2,
      responseFormat: { type: "json_object" },
    });
  } catch (err) {
    if (err instanceof LLMDisabledError) return [];
    logger.warn(`insights: JSON response mode failed, retrying plain chat (${err.message})`);
    result = await chat({ messages, maxTokens: 4000, temperature: 0.2 });
  }

  try {
    await recordUsage({
      workspaceId,
      feature: "insights",
      model: result.model || env.AZURE_OPENAI_DEPLOYMENT || "unknown",
      promptTokens: result.usage?.prompt_tokens || 0,
      completionTokens: result.usage?.completion_tokens || 0,
      costUSD: result.costUSD || 0,
      metadata: {
        prompt_version: systemPrompts.PROMPT_VERSION,
        model_version: LLM_MODEL_VERSION,
      },
    });
  } catch (err) {
    logger.warn(`insights: usage meter failed (${err.message})`);
  }

  const parsed = extractJsonObject(result.text);
  const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
  return suggestions
    .map((item, index) => normalizeLLMInsightSuggestion(item, index))
    .filter(Boolean)
    .slice(0, 3);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function generateForWorkspace(workspaceId) {
  const [sentiment, perf, content, timing, trend] = await Promise.all([
    generateSentimentSummary(workspaceId).catch(() => []),
    generatePerformanceAnomalies(workspaceId).catch(() => []),
    generateContentRecommendations(workspaceId).catch(() => []),
    generateBestPostingTime(workspaceId).catch(() => []),
    generateMenaTrend(workspaceId).catch(() => []),
  ]);

  let llm = [];
  try {
    llm = await generateAzureInsightSuggestions(workspaceId);
  } catch (err) {
    if (err.code === "LLM_BUDGET_EXCEEDED") throw err;
    logger.warn(`insights: Azure suggestions skipped (${err.message})`);
  }

  const all = [...sentiment, ...perf, ...content, ...timing, ...trend, ...llm].map((i) => ({
    workspace_id: workspaceId,
    ...i,
  }));

  if (all.length === 0) return [];

  const saved = await db.insertMany(TABLE, all);
  return saved;
}

module.exports = {
  TABLE,
  listInsights,
  listInsightsForWorkspace,
  projectInsightFlat,
  enrichInsightWithTip,
  contextForInsight,
  generateForWorkspace,
  generateSentimentSummary,
  generatePerformanceAnomalies,
  generateContentRecommendations,
  generateBestPostingTime,
  generateMenaTrend,
  buildLLMInsightContext,
  generateAzureInsightSuggestions,
};
