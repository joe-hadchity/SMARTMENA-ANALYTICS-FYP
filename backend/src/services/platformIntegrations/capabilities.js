/**
 * Static capability matrix for the SmartMENA beta architecture.
 *
 * This file is the single source of truth for "what can each platform
 * integration do right now, and what will it support at GA?". The
 * /api/integrations/platform-capabilities endpoint projects this object
 * almost verbatim so the frontend can render an honest connect-account
 * screen.
 *
 * Status legend:
 *   - "mock_ready"      : method returns mocked but structured data today
 *   - "stubbed"         : method returns a not_implemented payload today
 *   - "planned"         : not in this release, on the roadmap
 *   - "not_supported"   : intentionally out of scope for this platform
 */

const METHODS = ["fetchAccountMetadata", "fetchPostMetadata", "fetchInsights"];

const CAPABILITIES = {
  meta: {
    key: "meta",
    displayName: "Meta (Instagram + Facebook)",
    platforms: ["meta_instagram", "meta_facebook"],
    status: "live_ready",
    priority: 1,
    authModel: "oauth2_user_token",
    plannedScopes: [
      "instagram_basic",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ],
    methods: {
      fetchAccountMetadata: "live",
      fetchPostMetadata: "live",
      fetchInsights: "live",
    },
    features: {
      accountSync: "live",
      postSync: "live",
      audienceSnapshots: "live",
      realtimeWebhooks: "planned",
      paidAds: "planned",
    },
    rateLimits: {
      note: "Graph API enforces per-user-token and per-app BUC limits.",
      hourlyCallsPerToken: 200,
    },
    limitations:
      "Phase 5 live OAuth: Instagram accounts must be Business/Creator linked to a Facebook Page for insights. The beta still falls back to mock data when META_APP_ID/SECRET are not configured.",
    targetRelease: "beta_phase_5",
    oauth: {
      initUrl: "/api/oauth/meta/init",
      callbackUrl: "/api/oauth/meta/callback",
      statusUrl: "/api/oauth/meta/status",
    },
  },
  tiktok: {
    key: "tiktok",
    displayName: "TikTok",
    platforms: ["tiktok"],
    status: "stubbed",
    priority: 2,
    authModel: "oauth2_user_token",
    plannedScopes: [
      "user.info.basic",
      "user.info.profile",
      "user.info.stats",
      "video.list",
      "video.insights",
    ],
    methods: {
      fetchAccountMetadata: "stubbed",
      fetchPostMetadata: "stubbed",
      fetchInsights: "stubbed",
    },
    features: {
      accountSync: "planned",
      postSync: "planned",
      audienceSnapshots: "planned",
      realtimeWebhooks: "not_supported",
      paidAds: "planned",
    },
    rateLimits: {
      note: "TikTok for Developers enforces per-app QPS quotas; exact limits depend on approved tier.",
    },
    limitations:
      "Requires an approved TikTok for Developers app. Research API has stricter review.",
    targetRelease: "post_beta",
  },
  x: {
    key: "x",
    displayName: "X (Twitter)",
    platforms: ["x"],
    status: "stubbed",
    priority: 3,
    authModel: "oauth2_pkce_user_token",
    plannedScopes: [
      "tweet.read",
      "users.read",
      "offline.access",
      "tweet.write", // scheduling phase only
    ],
    methods: {
      fetchAccountMetadata: "stubbed",
      fetchPostMetadata: "stubbed",
      fetchInsights: "stubbed",
    },
    features: {
      accountSync: "planned",
      postSync: "planned",
      audienceSnapshots: "planned",
      realtimeWebhooks: "planned",
      paidAds: "not_supported",
    },
    rateLimits: {
      note: "X API v2 caps vary dramatically by paid tier (Basic/Pro/Enterprise).",
    },
    limitations:
      "Requires a paid X API tier for meaningful post history and insights. organic_metrics needs user-context OAuth.",
    targetRelease: "post_beta",
  },
};

function listCapabilities() {
  return Object.values(CAPABILITIES).sort((a, b) => a.priority - b.priority);
}

function getCapabilities(platformKey) {
  return CAPABILITIES[platformKey] || null;
}

module.exports = {
  METHODS,
  CAPABILITIES,
  listCapabilities,
  getCapabilities,
};
