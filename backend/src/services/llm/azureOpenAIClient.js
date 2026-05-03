/**
 * Shared Azure OpenAI client for SmartMENA.
 *
 * One place that knows how to talk to Azure OpenAI from the backend. Every
 * LLM-powered feature in the product (assistant dock, report narrative) should
 * import from here and NEVER re-wire
 * Azure config on its own.
 *
 * Design notes
 * ------------
 * - Uses the official `openai` (v4) SDK in Azure-compatible mode via
 *   `baseURL + defaultQuery["api-version"] + defaultHeaders["api-key"]`. This
 *   keeps Azure as a drop-in for the OpenAI Chat Completions API.
 * - Returns either a full string (non-streaming) or an async iterable of
 *   text chunks (streaming). Callers decide.
 * - If Azure env vars are missing, the module still loads. The functions
 *   throw a structured `LLMDisabledError` so controllers can degrade
 *   gracefully (e.g. fall back to the local responder, surface a banner
 *   on the frontend).
 * - Token usage is reported back so `usageMeter.js` can persist it.
 */

const OpenAI = require("openai");
const env = require("../../config/env");
const logger = require("../../utils/logger");

class LLMDisabledError extends Error {
  constructor(message = "Azure OpenAI is not configured.") {
    super(message);
    this.name = "LLMDisabledError";
    this.code = "LLM_DISABLED";
  }
}

let clientSingleton = null;

function getClient() {
  if (!env.AZURE_OPENAI_ENABLED) return null;
  if (clientSingleton) return clientSingleton;

  clientSingleton = new OpenAI({
    apiKey: env.AZURE_OPENAI_API_KEY,
    baseURL: `${env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${env.AZURE_OPENAI_DEPLOYMENT}`,
    defaultQuery: { "api-version": env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { "api-key": env.AZURE_OPENAI_API_KEY },
  });

  logger.info(
    `Azure OpenAI client initialized (deployment="${env.AZURE_OPENAI_DEPLOYMENT}", api-version="${env.AZURE_OPENAI_API_VERSION}").`,
  );
  return clientSingleton;
}

function isEnabled() {
  return Boolean(env.AZURE_OPENAI_ENABLED);
}

function isReasoningDeployment() {
  return /^o\d/i.test(env.AZURE_OPENAI_DEPLOYMENT || "");
}

/**
 * Rough USD cost estimator. Azure bills per 1K tokens, priced by deployment.
 * We use a conservative default of gpt-4o-mini-ish rates. When a real price
 * table is available we can swap this for a lookup keyed on deployment name.
 */
function estimateCostUSD({ promptTokens = 0, completionTokens = 0 }) {
  const PRICE_INPUT_PER_1K = 0.00015; // $0.15 per 1M tokens
  const PRICE_OUTPUT_PER_1K = 0.0006; // $0.60 per 1M tokens
  const cost =
    (promptTokens / 1000) * PRICE_INPUT_PER_1K +
    (completionTokens / 1000) * PRICE_OUTPUT_PER_1K;
  return Number(cost.toFixed(4));
}

/**
 * Non-streaming chat completion.
 *
 * @param {Object}   p
 * @param {Array}    p.messages        OpenAI-style [{role, content}, ...]
 * @param {number}  [p.temperature=0.4]
 * @param {number}  [p.maxTokens=600]
 * @param {Object}  [p.responseFormat] Optional { type: "json_object" } for
 *                                    strict JSON replies.
 * @returns {Promise<{ text: string, usage: {prompt_tokens, completion_tokens, total_tokens}, model: string, costUSD: number }>}
 */
async function chat({
  messages,
  temperature = 0.4,
  maxTokens = 600,
  responseFormat,
}) {
  const client = getClient();
  if (!client) throw new LLMDisabledError();

  const params = {
    // With Azure + baseURL-per-deployment this "model" field is required by
    // the SDK but ignored by Azure (the deployment in the URL wins).
    model: env.AZURE_OPENAI_DEPLOYMENT,
    messages,
  };
  if (isReasoningDeployment()) {
    params.max_completion_tokens = maxTokens;
  } else {
    params.temperature = temperature;
    params.max_tokens = maxTokens;
  }
  if (responseFormat) params.response_format = responseFormat;

  const completion = await client.chat.completions.create(params);

  const choice = completion.choices?.[0];
  const text = choice?.message?.content ?? "";
  const usage = completion.usage || {};
  const costUSD = estimateCostUSD({
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
  });

  return {
    text,
    usage: {
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
    },
    model: env.AZURE_OPENAI_DEPLOYMENT,
    costUSD,
    finishReason: choice?.finish_reason || null,
  };
}

/**
 * Streaming chat completion.
 *
 * Returns an async generator that yields `{ delta }` for each token chunk
 * and a final `{ done: true, usage, text, model, costUSD }` frame.
 *
 * Usage:
 *   for await (const frame of streamChat({messages})) {
 *     if (frame.delta) sendSSE("token", frame.delta);
 *     else if (frame.done) persistUsage(frame.usage);
 *   }
 */
async function* streamChat({
  messages,
  temperature = 0.4,
  maxTokens = 600,
}) {
  const client = getClient();
  if (!client) throw new LLMDisabledError();

  const params = {
    model: env.AZURE_OPENAI_DEPLOYMENT,
    messages,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (isReasoningDeployment()) {
    params.max_completion_tokens = maxTokens;
  } else {
    params.temperature = temperature;
    params.max_tokens = maxTokens;
  }

  const stream = await client.chat.completions.create(params);

  let fullText = "";
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  for await (const chunk of stream) {
    // Azure sometimes emits an empty-choices frame that only carries usage.
    if (chunk.usage) usage = chunk.usage;

    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      yield { delta };
    }
  }

  const costUSD = estimateCostUSD({
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
  });

  yield {
    done: true,
    text: fullText,
    usage,
    model: env.AZURE_OPENAI_DEPLOYMENT,
    costUSD,
  };
}

module.exports = {
  chat,
  streamChat,
  isEnabled,
  isReasoningDeployment,
  estimateCostUSD,
  LLMDisabledError,
};
