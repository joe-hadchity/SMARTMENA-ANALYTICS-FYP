/**
 * Usage meter for Azure OpenAI calls.
 *
 * Every LLM-powered feature should wrap its call in `withUsageMeter` so the
 * token + cost ledger in `llm_usage` stays complete. When the `llm_usage`
 * table is missing (migration not yet applied) or Supabase is not
 * configured, the wrapper silently degrades and still returns the result
 * of the underlying LLM call.
 */

const { getSupabase } = require("../../config/supabase");
const logger = require("../../utils/logger");
const env = require("../../config/env");

const VALID_FEATURES = new Set([
  "assistant",
  "caption_studio",
  "report_narrative",
  "competitor_digest",
]);

async function recordUsage({
  workspaceId = null,
  feature,
  model,
  promptTokens = 0,
  completionTokens = 0,
  costUSD = 0,
  metadata = {},
}) {
  if (!VALID_FEATURES.has(feature)) {
    logger.warn(`usageMeter: unknown feature "${feature}". Skipping insert.`);
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) return null;

  const payload = {
    workspace_id: workspaceId || null,
    feature,
    model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    cost_usd: costUSD,
    metadata_json: metadata || {},
  };

  const { data, error } = await supabase
    .from("llm_usage")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    // Table missing (42P01) means the v6 migration wasn't applied yet.
    // Degrade gracefully so the feature keeps working.
    logger.warn(`usageMeter: insert failed (${error.code || "?"}): ${error.message}`);
    return null;
  }

  return data?.id || null;
}

/**
 * Run `fn()` (returning { usage: {prompt_tokens, completion_tokens},
 * model, costUSD, ... }) and persist a row into `llm_usage`.
 */
async function withUsageMeter({ workspaceId, feature, metadata = {} }, fn) {
  const result = await fn();
  try {
    await recordUsage({
      workspaceId,
      feature,
      model: result?.model || "unknown",
      promptTokens: result?.usage?.prompt_tokens || 0,
      completionTokens: result?.usage?.completion_tokens || 0,
      costUSD: result?.costUSD || 0,
      metadata,
    });
  } catch (err) {
    logger.warn(`usageMeter: failed to record usage (${err?.message || err})`);
  }
  return result;
}

/**
 * Returns the total prompt+completion tokens used by a workspace in the
 * current calendar month. 0 when the table is missing or Supabase is off.
 */
async function getMonthlyUsage(workspaceId) {
  const supabase = getSupabase();
  if (!supabase || !workspaceId) return { totalTokens: 0, budget: env.LLM_MONTHLY_TOKEN_BUDGET };

  const firstOfMonth = new Date();
  firstOfMonth.setUTCDate(1);
  firstOfMonth.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("llm_usage")
    .select("prompt_tokens, completion_tokens")
    .eq("workspace_id", workspaceId)
    .gte("created_at", firstOfMonth.toISOString());

  if (error) {
    logger.warn(`usageMeter: monthly usage query failed (${error.message})`);
    return { totalTokens: 0, budget: env.LLM_MONTHLY_TOKEN_BUDGET };
  }

  const totalTokens = (data || []).reduce(
    (sum, row) => sum + (row.prompt_tokens || 0) + (row.completion_tokens || 0),
    0,
  );

  return { totalTokens, budget: env.LLM_MONTHLY_TOKEN_BUDGET };
}

/**
 * Throws a structured error if the workspace has blown past its monthly
 * budget. The controller can map it to a 429 with upgrade-CTA info.
 */
async function assertBudget(workspaceId) {
  const { totalTokens, budget } = await getMonthlyUsage(workspaceId);
  if (totalTokens >= budget) {
    const err = new Error("Monthly AI token budget exceeded for this workspace.");
    err.code = "LLM_BUDGET_EXCEEDED";
    err.status = 429;
    err.details = { totalTokens, budget };
    throw err;
  }
  return { totalTokens, budget };
}

module.exports = {
  withUsageMeter,
  recordUsage,
  getMonthlyUsage,
  assertBudget,
};
