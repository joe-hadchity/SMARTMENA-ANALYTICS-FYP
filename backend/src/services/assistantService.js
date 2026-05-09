/**
 * assistantService
 *
 * Powers the "SmartMENA Copilot" chat experience (InsightsDock on the
 * frontend). Responsibilities:
 *
 *   1. Build a compact, grounded context bundle for the workspace so the
 *      LLM can answer questions using REAL data instead of hallucinating.
 *   2. Own conversation + message persistence (tables: public.conversations,
 *      public.messages).
 *   3. Expose a `streamAssistantReply()` async generator the controller
 *      can forward to the browser via Server-Sent Events.
 *
 * Usage meter + system-prompt versioning are handled here so individual
 * route handlers stay thin.
 */

const db = require("./dbService");
const { getSupabase } = require("../config/supabase");
const workspaceService = require("./workspaceService");
const dashboardService = require("./dashboardService");
const insightsService = require("./insightsService");
const recommendationService = require("./recommendationService");
const logger = require("../utils/logger");

const {
  streamChat,
  chat,
  isEnabled: isLLMEnabled,
  LLMDisabledError,
} = require("./llm/azureOpenAIClient");
const systemPrompts = require("./llm/systemPrompts");
const { recordUsage, assertBudget } = require("./llm/usageMeter");

const MAX_HISTORY_MESSAGES = 12; // last N turns sent to the model
const MAX_INSIGHTS_IN_CONTEXT = 5;
const MAX_RECOMMENDATIONS_IN_CONTEXT = 5;

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

// ----------------------------------------------------------------------------
// Context bundle
// ----------------------------------------------------------------------------

/**
 * Collect a small, JSON-serialisable snapshot of the workspace that the
 * assistant can quote from. Every section degrades gracefully if the
 * underlying table / data isn't there yet.
 */
async function buildContextBundle(workspaceId, { locale = "en" } = {}) {
  const bundle = {
    locale,
    workspace: null,
    brandVoice: null,
    dashboard: null,
    insights: [],
    recommendations: [],
    warnings: [],
  };

  try {
    const ws = await workspaceService.getWorkspaceById(workspaceId);
    bundle.workspace = {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      region_default: ws.region_default,
      locale_default: ws.locale_default,
      industry_hint: ws.industry_hint || null,
      primary_region: ws.primary_region || ws.region_default || null,
    };
  } catch (err) {
    bundle.warnings.push(`workspace_lookup_failed:${err.message}`);
  }

  try {
    const bv = await workspaceService.getBrandVoice(workspaceId);
    bundle.brandVoice = {
      industry_hint: bv.industry_hint || null,
      primary_region: bv.primary_region || null,
      tone_keywords: bv.brand_voice?.tone_keywords || [],
      default_dialect: bv.brand_voice?.default_dialect || null,
      do: bv.brand_voice?.do || [],
      dont: bv.brand_voice?.dont || [],
      sample_phrases: bv.brand_voice?.sample_phrases || [],
    };
  } catch (err) {
    bundle.warnings.push(`brand_voice_skipped:${err.message}`);
  }

  try {
    const summary = await dashboardService.getWorkspaceSummary(workspaceId);
    bundle.dashboard = {
      totals: summary.totals,
      syncJobs: summary.syncJobs,
      accountsBreakdown: (summary.accountsBreakdown || []).map((a) => ({
        platform: a.platform,
        handle: a.handle,
        status: a.status,
        followers: a.followers_count,
        posts_count: a.posts_count,
        last_synced_at: a.last_synced_at,
      })),
      generatedAt: summary.generatedAt,
    };
  } catch (err) {
    bundle.warnings.push(`dashboard_skipped:${err.message}`);
  }

  try {
    const insights = await insightsService.listInsightsForWorkspace(
      workspaceId,
      { limit: MAX_INSIGHTS_IN_CONTEXT },
    );
    bundle.insights = (insights || []).slice(0, MAX_INSIGHTS_IN_CONTEXT).map((i) => ({
      type: i.insight_type,
      title: i.title,
      summary: i.summary,
      severity: i.severity,
      source: i.source,
    }));
  } catch (err) {
    bundle.warnings.push(`insights_skipped:${err.message}`);
  }

  try {
    const recs = await recommendationService.listRecommendationsForWorkspace(
      workspaceId,
      { limit: MAX_RECOMMENDATIONS_IN_CONTEXT },
    );
    bundle.recommendations = (recs || [])
      .slice(0, MAX_RECOMMENDATIONS_IN_CONTEXT)
      .map((r) => ({
        type: r.recommendation_type,
        title: r.title,
        description: r.description,
        priority: r.priority,
      }));
  } catch (err) {
    bundle.warnings.push(`recommendations_skipped:${err.message}`);
  }

  return bundle;
}

// ----------------------------------------------------------------------------
// Conversations + messages
// ----------------------------------------------------------------------------

async function listConversations(workspaceId, { limit = 20 } = {}) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    // Table missing (migration not applied) -> return empty list.
    if (error.code === "42P01") return [];
    const err = new Error(error.message || "Failed to list conversations");
    err.status = 400;
    throw err;
  }
  return data || [];
}

async function getConversation(conversationId) {
  return db.getById("conversations", conversationId);
}

async function createConversation({ workspaceId, title, feature = "assistant" }) {
  const supabase = requireClient();
  const row = {
    workspace_id: workspaceId,
    title: title || null,
    feature,
  };
  const { data, error } = await supabase
    .from("conversations")
    .insert(row)
    .select("*")
    .single();
  if (error) {
    const err = new Error(error.message || "Failed to create conversation");
    err.status = 400;
    throw err;
  }
  return data;
}

async function ensureConversation({ workspaceId, conversationId, title }) {
  if (conversationId) {
    try {
      return await getConversation(conversationId);
    } catch (err) {
      logger.warn(
        `assistant: conversation ${conversationId} not found, creating new one (${err.message})`,
      );
    }
  }
  return createConversation({ workspaceId, title });
}

async function listMessages(conversationId, { limit = 50 } = {}) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    if (error.code === "42P01") return [];
    const err = new Error(error.message || "Failed to list messages");
    err.status = 400;
    throw err;
  }
  return data || [];
}

async function appendMessage({
  conversationId,
  role,
  content,
  promptTokens = null,
  completionTokens = null,
  metadata = {},
}) {
  const supabase = requireClient();
  const row = {
    conversation_id: conversationId,
    role,
    content,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    metadata_json: metadata,
  };
  const { data, error } = await supabase
    .from("messages")
    .insert(row)
    .select("*")
    .single();
  if (error) {
    // Table missing -> silently ignore persistence so the stream still works.
    if (error.code === "42P01") {
      logger.warn(
        "assistant: messages table missing; skipping persistence (apply schema_v6.sql).",
      );
      return null;
    }
    throw error;
  }
  // Touch the conversation's updated_at so it sorts to the top.
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data;
}

// ----------------------------------------------------------------------------
// Chat orchestration
// ----------------------------------------------------------------------------

function buildLLMMessages({ contextBundle, history, userMessage, locale }) {
  const system = systemPrompts.assistant(contextBundle, locale);

  const trimmedHistory = (history || [])
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  return [
    { role: "system", content: system },
    ...trimmedHistory,
    { role: "user", content: userMessage },
  ];
}

/**
 * Stream an assistant reply. Yields frames of the shape:
 *   { type: "conversation", conversationId }
 *   { type: "token", delta }
 *   { type: "done", message, usage }
 *   { type: "error", code, message }
 *
 * The controller turns each frame into an SSE event.
 */
async function* streamAssistantReply({
  workspaceId,
  conversationId: initialConversationId,
  userMessage,
  locale = "en",
}) {
  if (!userMessage || typeof userMessage !== "string") {
    yield { type: "error", code: "INVALID_INPUT", message: "message is required" };
    return;
  }

  // Resolve / create conversation up front so every following frame carries
  // the id (the frontend may need it even on error).
  let conversation;
  try {
    conversation = await ensureConversation({
      workspaceId,
      conversationId: initialConversationId,
      title: userMessage.slice(0, 60),
    });
  } catch (err) {
    yield { type: "error", code: "CONVERSATION_FAILED", message: err.message };
    return;
  }
  const conversationId = conversation?.id || null;
  yield { type: "conversation", conversationId };

  // Persist user message (non-fatal if it fails).
  try {
    await appendMessage({ conversationId, role: "user", content: userMessage });
  } catch (err) {
    logger.warn(`assistant: failed to persist user message (${err.message})`);
  }

  if (!isLLMEnabled()) {
    // Graceful degradation: frontend will fall back to the local keyword
    // responder. We still return a placeholder so UX isn't blank.
    yield {
      type: "error",
      code: "LLM_DISABLED",
      message:
        "The AI copilot is not configured for this environment yet. Set AZURE_OPENAI_* to enable live answers.",
    };
    return;
  }

  // Enforce monthly budget (optional — no-op if Supabase or table missing).
  try {
    await assertBudget(workspaceId);
  } catch (err) {
    if (err.code === "LLM_BUDGET_EXCEEDED") {
      yield { type: "error", code: err.code, message: err.message };
      return;
    }
    // Unknown errors from the budget check shouldn't block chat.
    logger.warn(`assistant: budget check failed (${err.message})`);
  }

  // Build context bundle + conversation history.
  const contextBundle = await buildContextBundle(workspaceId, { locale });
  let history = [];
  try {
    history = await listMessages(conversationId, { limit: MAX_HISTORY_MESSAGES });
  } catch (err) {
    logger.warn(`assistant: history lookup failed (${err.message})`);
  }

  const messages = buildLLMMessages({
    contextBundle,
    history: history.filter((m) => m.role !== "system"),
    userMessage,
    locale,
  });

  let fullText = "";
  let finalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let model = null;
  let costUSD = 0;

  try {
    for await (const frame of streamChat({ messages, maxTokens: 1200, temperature: 0.3 })) {
      if (frame.delta) {
        fullText += frame.delta;
        yield { type: "token", delta: frame.delta };
      } else if (frame.done) {
        finalUsage = frame.usage || finalUsage;
        model = frame.model;
        costUSD = frame.costUSD || 0;
      }
    }
  } catch (err) {
    if (err instanceof LLMDisabledError) {
      yield { type: "error", code: "LLM_DISABLED", message: err.message };
      return;
    }

    logger.warn(`assistant: streaming failed, retrying non-streaming (${err?.message || err})`);
    try {
      const fallback = await chat({ messages, maxTokens: 1200, temperature: 0.3 });
      fullText = fallback.text || "";
      finalUsage = fallback.usage || finalUsage;
      model = fallback.model;
      costUSD = fallback.costUSD || 0;
      if (fullText) yield { type: "token", delta: fullText };
    } catch (fallbackErr) {
      if (fallbackErr instanceof LLMDisabledError) {
        yield { type: "error", code: "LLM_DISABLED", message: fallbackErr.message };
        return;
      }
      yield {
        type: "error",
        code: "LLM_FAILED",
        message: fallbackErr?.message || err?.message || "LLM request failed",
      };
      return;
    }
  }

  // Persist assistant message.
  let assistantMsg = null;
  try {
    assistantMsg = await appendMessage({
      conversationId,
      role: "assistant",
      content: fullText,
      promptTokens: finalUsage.prompt_tokens,
      completionTokens: finalUsage.completion_tokens,
      metadata: {
        model,
        cost_usd: costUSD,
        prompt_version: systemPrompts.PROMPT_VERSION,
        context_warnings: contextBundle.warnings,
      },
    });
  } catch (err) {
    logger.warn(`assistant: failed to persist assistant message (${err.message})`);
  }

  // Meter usage.
  try {
    await recordUsage({
      workspaceId,
      feature: "assistant",
      model: model || "unknown",
      promptTokens: finalUsage.prompt_tokens || 0,
      completionTokens: finalUsage.completion_tokens || 0,
      costUSD,
      metadata: {
        conversation_id: conversationId,
        prompt_version: systemPrompts.PROMPT_VERSION,
        locale,
      },
    });
  } catch (err) {
    logger.warn(`assistant: usage meter failed (${err.message})`);
  }

  yield {
    type: "done",
    message: assistantMsg || {
      conversation_id: conversationId,
      role: "assistant",
      content: fullText,
    },
    usage: finalUsage,
    model,
    costUSD,
  };
}

module.exports = {
  buildContextBundle,
  listConversations,
  getConversation,
  createConversation,
  ensureConversation,
  listMessages,
  appendMessage,
  streamAssistantReply,
};
