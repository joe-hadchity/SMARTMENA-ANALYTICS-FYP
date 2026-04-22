const env = require("../config/env");
const { isEnabled: isLLMEnabled } = require("../services/llm");

function getHealth(req, res) {
  res.json({
    status: "ok",
    service: "smartmena-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    features: {
      llm: {
        enabled: isLLMEnabled(),
        provider: "azure_openai",
        deployment: isLLMEnabled() ? env.AZURE_OPENAI_DEPLOYMENT : null,
        apiVersion: isLLMEnabled() ? env.AZURE_OPENAI_API_VERSION : null,
        monthlyTokenBudget: env.LLM_MONTHLY_TOKEN_BUDGET,
      },
    },
  });
}

module.exports = { getHealth };
