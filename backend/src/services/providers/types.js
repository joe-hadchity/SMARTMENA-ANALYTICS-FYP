/**
 * Shared types for social-platform providers.
 *
 * A provider is a pluggable adapter that knows how to talk to one external
 * platform (Meta / Instagram, Meta / Facebook, TikTok, X, ...). The rest of
 * the backend talks to providers only through the interface defined here.
 *
 * Providers live under `services/providers/<provider>Provider.js` and are
 * registered in `services/providers/index.js`. A provider can be "mock"
 * (fabricates data locally) or "real" (hits the platform's API). Both
 * implementations must respect the contract below.
 *
 * ---------------------------------------------------------------------------
 * Contract (all methods async, all return plain objects):
 *
 *   beginOAuth(input)                -> { authUrl: string, state: string }
 *   completeOAuth(input)             -> NormalizedAccount
 *   fetchAccountInfo(account)        -> NormalizedAccount
 *   listPosts(account, options)      -> NormalizedPost[]
 *   fetchPostMetrics(account, post)  -> NormalizedMetrics
 *
 * ---------------------------------------------------------------------------
 * Normalized shapes (platform-agnostic, camelCase):
 *
 *   NormalizedAccount = {
 *     provider: 'meta_instagram' | 'meta_facebook' | 'tiktok' | 'x',
 *     externalAccountId: string,
 *     handle?: string,
 *     displayName?: string,
 *     avatarUrl?: string,
 *     profileUrl?: string,
 *     accessTokenCiphertext?: string,
 *     tokenExpiresAt?: string,     // ISO 8601
 *     isMock: boolean,
 *     metadata?: object,
 *   }
 *
 *   NormalizedPost = {
 *     externalPostId: string,
 *     postType: 'image' | 'video' | 'carousel' | 'reel' | 'story' | 'text',
 *     caption?: string,
 *     captionLang?: 'ar' | 'en' | 'mixed',
 *     mediaUrl?: string,
 *     permalink?: string,
 *     postedAt?: string,            // ISO 8601
 *     raw?: object,                 // keep-as-is payload from provider
 *     metrics?: NormalizedMetrics,  // optional initial snapshot
 *   }
 *
 *   NormalizedMetrics = {
 *     capturedAt?: string,          // ISO 8601; defaults to now
 *     likes?: number,
 *     comments?: number,
 *     shares?: number,
 *     saves?: number,
 *     impressions?: number,
 *     reach?: number,
 *     videoViews?: number,
 *     engagementRate?: number,      // 0..1
 *   }
 *
 * ---------------------------------------------------------------------------
 * Provider keys supported by the registry (see `index.js`):
 *
 *   'meta_instagram' | 'meta_facebook' | 'tiktok' | 'x'
 *
 * Mock vs real is a property of the individual provider implementation, not
 * of the interface.
 */

const PROVIDER_KEYS = ["meta_instagram", "meta_facebook", "tiktok", "x"];

function isSupportedProvider(key) {
  return PROVIDER_KEYS.includes(key);
}

module.exports = {
  PROVIDER_KEYS,
  isSupportedProvider,
};
