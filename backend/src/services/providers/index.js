/**
 * Provider registry.
 *
 * Maps a provider key to a concrete implementation. The beta ships mock-only
 * providers; real Meta/TikTok/X adapters will be added here without touching
 * any caller.
 *
 * Usage:
 *   const { getProvider } = require("./providers");
 *   const provider = getProvider("meta_instagram");
 *   const posts = await provider.listPosts(account, { limit: 20 });
 */

const { isSupportedProvider } = require("./types");
const metaMockProvider = require("./metaMockProvider");

/**
 * Populated phase-by-phase as providers are implemented.
 * Phase 2 registers `meta_instagram` and `meta_facebook` in mock mode.
 * TikTok and X land as drop-ins later without touching any caller.
 */
const registry = Object.create(null);

function registerProvider(key, provider) {
  if (!isSupportedProvider(key)) {
    throw new Error(`Cannot register unsupported provider key: ${key}`);
  }
  registry[key] = provider;
}

registerProvider("meta_instagram", metaMockProvider("meta_instagram"));
registerProvider("meta_facebook", metaMockProvider("meta_facebook"));

function getProvider(key) {
  if (!isSupportedProvider(key)) {
    const err = new Error(`Unknown provider: ${key}`);
    err.status = 400;
    throw err;
  }
  const provider = registry[key];
  if (!provider) {
    const err = new Error(`Provider not yet implemented: ${key}`);
    err.status = 501;
    throw err;
  }
  return provider;
}

function hasProvider(key) {
  return Boolean(registry[key]);
}

module.exports = {
  getProvider,
  hasProvider,
  registerProvider,
  registry,
};
