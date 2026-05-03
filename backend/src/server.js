const app = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");
const { isEnabled: isLLMEnabled } = require("./services/llm");
const {
  startPublishWorker,
} = require("./services/scheduledPostService");

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
  }
});
