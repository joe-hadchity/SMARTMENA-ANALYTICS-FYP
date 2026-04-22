const app = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");
const { isEnabled: isLLMEnabled } = require("./services/llm");
const {
  startPublishWorker,
} = require("./services/scheduledPostService");
const {
  startDigestWorker,
} = require("./services/competitorDigestService");
const {
  startTrendWorker,
} = require("./services/trends/trendWorker");

app.listen(env.PORT, () => {
  logger.info(`SmartMENA backend listening on http://localhost:${env.PORT}`);
  logger.info(`ML service base URL: ${env.ML_SERVICE_URL}`);
  if (isLLMEnabled()) {
    logger.info(
      `Azure OpenAI: enabled (deployment="${env.AZURE_OPENAI_DEPLOYMENT}")`,
    );
  } else {
    logger.warn(
      "Azure OpenAI: disabled. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT in .env to enable the AI copilot layer.",
    );
  }

  // Background worker: every 60s, pick due scheduled posts and publish them.
  // Skipped in test / smoke-test runs via SMARTMENA_DISABLE_WORKERS=1.
  if (process.env.SMARTMENA_DISABLE_WORKERS !== "1") {
    startPublishWorker({ intervalMs: 60_000 });
    logger.info("scheduledPostService: publish worker started (60s cadence)");

    // Weekly-ish competitor digest. Default is 24h; override with
    // SMARTMENA_DIGEST_INTERVAL_MS=60000 to smoke-test quickly.
    const digestInterval =
      Number(process.env.SMARTMENA_DIGEST_INTERVAL_MS) ||
      24 * 60 * 60 * 1000;
    startDigestWorker({ intervalMs: digestInterval });
    logger.info(
      `competitorDigestService: digest worker started (${Math.round(digestInterval / 1000)}s cadence)`,
    );

    // Trend Radar Layer 1 -- daily aggregation. Default 6h; override with
    // SMARTMENA_TREND_INTERVAL_MS for smoke tests.
    const trendInterval =
      Number(process.env.SMARTMENA_TREND_INTERVAL_MS) || 6 * 60 * 60 * 1000;
    startTrendWorker({
      intervalMs: trendInterval,
      windowDays: Number(process.env.SMARTMENA_TREND_WINDOW_DAYS) || 30,
      allowLLM: process.env.SMARTMENA_TREND_ALLOW_LLM === "1",
    });
    logger.info(
      `trendWorker: trend aggregator started (${Math.round(trendInterval / 1000)}s cadence)`,
    );
  }
});
