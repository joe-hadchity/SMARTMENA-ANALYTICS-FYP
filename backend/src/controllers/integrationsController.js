const {
  capabilities,
  listRegisteredProviderKeys,
} = require("../services/platformIntegrations");
const env = require("../config/env");

/**
 * GET /api/integrations/platform-capabilities
 *
 * Returns a description of what each platform integration is expected
 * to support in this beta architecture. It is intentionally static --
 * driven by the capability matrix in
 * services/platformIntegrations/capabilities.js -- so the frontend can
 * render an honest "Connect account" screen without hitting any
 * external APIs.
 */
async function getPlatformCapabilities(req, res) {
  const platforms = capabilities.listCapabilities().map((p) => {
    if (p.key !== "meta") return { ...p, runtimeMode: "mock" };
    return {
      ...p,
      runtimeMode: env.META_OAUTH_ENABLED ? "live" : "mock",
    };
  });

  res.status(200).json({
    architecture: {
      mode: env.META_OAUTH_ENABLED ? "live_first" : "mock_first",
      providerRegistry: "services/providers (mock + live)",
      integrationLayer: "services/platformIntegrations (Graph v19 live when enabled)",
      oauthEnabled: env.META_OAUTH_ENABLED,
      notes: env.META_OAUTH_ENABLED
        ? "Meta Graph v19 OAuth is configured. Other providers remain stubbed."
        : "Meta Graph OAuth disabled (missing META_APP_ID / META_APP_SECRET / TOKEN_ENCRYPTION_KEY). Integration methods fall back to mock data.",
    },
    methods: capabilities.METHODS,
    platforms,
    registeredProviders: listRegisteredProviderKeys(),
  });
}

module.exports = { getPlatformCapabilities };
