/**
 * platformIntegrations -- single entry point for all platform-level
 * integration services (Meta, TikTok, X). These services are the
 * forward-looking layer where live API calls will live once OAuth is
 * wired up. Today they return structured stubs.
 *
 * Do NOT confuse this with services/providers/*, which is the
 * mock-first social-account sync registry used by existing routes.
 * That layer will continue to work unchanged. This layer is where the
 * real Graph/TikTok/X API calls will eventually plug in.
 */

const metaService = require("./metaService");
const tiktokService = require("./tiktokService");
const xService = require("./xService");
const capabilities = require("./capabilities");

const SERVICES_BY_PROVIDER_KEY = {
  [metaService.PROVIDER_KEY]: metaService,
  [tiktokService.PROVIDER_KEY]: tiktokService,
  [xService.PROVIDER_KEY]: xService,
};

const SERVICES_BY_PLATFORM = {
  meta_instagram: metaService,
  meta_facebook: metaService,
  tiktok: tiktokService,
  x: xService,
};

function getIntegrationService(platformOrProviderKey) {
  if (!platformOrProviderKey) return null;
  return (
    SERVICES_BY_PLATFORM[platformOrProviderKey] ||
    SERVICES_BY_PROVIDER_KEY[platformOrProviderKey] ||
    null
  );
}

function listRegisteredProviderKeys() {
  return Object.keys(SERVICES_BY_PROVIDER_KEY);
}

module.exports = {
  metaService,
  tiktokService,
  xService,
  capabilities,
  getIntegrationService,
  listRegisteredProviderKeys,
};
