import axios, { AxiosInstance } from "axios";

import type {
  AnalyticsOverview,
  AnalyticsTimeseries,
  BusinessProfile,
  Campaign,
  CampaignWithRelations,
  CompetitorAccount,
  CompetitorCandidate,
  CompetitorComparisonResponse,
  CompetitorDiscoveryResponse,
  HealthCheck,
  HashtagSearchResponse,
  HashtagTrendResponse,
  TrackedHashtag,
  Insight,
  InboxItem,
  InboxSummary,
  TrendIntelligenceResponse,
  MenaRecommendation,
  OAuthStatus,
  Provider,
  PlatformBreakdown,
  PlatformCapability,
  PostMetric,
  RoiResult,
  SentimentBreakdown,
  SentimentResult,
  SocialAccount,
  SyncedPost,
  TopPost,
  Workspace,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

const WORKSPACE_STORAGE_KEY = "smartmena.workspaceId";
const AUTH_TOKEN_STORAGE_KEY = "smartmena.authToken";
const AUTH_REFRESH_STORAGE_KEY = "smartmena.refreshToken";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthWorkspace = Workspace & {
  role?: "owner" | "admin" | "member" | "viewer" | "demo";
};

export type AuthPayload = {
  user: AuthUser;
  session?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    tokenType?: string;
  };
  workspaces: AuthWorkspace[];
  activeWorkspace: Workspace | null;
  activeRole: string | null;
};

function readWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  const env = process.env.NEXT_PUBLIC_WORKSPACE_ID;
  if (env) return env;
  try {
    return window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredWorkspaceId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
    else window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuthSession(
  session: AuthPayload["session"] | null,
) {
  if (typeof window === "undefined") return;
  try {
    if (session?.accessToken) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.accessToken);
      if (session.refreshToken) {
        window.localStorage.setItem(
          AUTH_REFRESH_STORAGE_KEY,
          session.refreshToken,
        );
      }
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_REFRESH_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearStoredAuth() {
  setStoredAuthSession(null);
  setStoredWorkspaceId(null);
}

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 60_000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use(async (config) => {
    const wsid = readWorkspaceId();
    if (wsid) {
      config.headers["x-workspace-id"] = wsid;
    }
    const token = readAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error?.response?.status === 401 &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        clearStoredAuth();
        window.location.assign("/login");
      }

      const data = error?.response?.data;
      const message =
        (data && typeof data === "object" && (data.message as string)) ||
        error.message ||
        "Request failed";
      const err = new Error(message) as Error & {
        status?: number;
        details?: unknown;
      };
      err.status = error?.response?.status;
      err.details = data?.details;
      return Promise.reject(err);
    },
  );

  return client;
}

const http = createClient();

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export const authApi = {
  login: async (input: {
    email: string;
    password: string;
  }): Promise<AuthPayload> => {
    const payload = (await http.post("/auth/login", input)).data;
    setStoredAuthSession(payload.session);
    if (payload.activeWorkspace?.id) {
      setStoredWorkspaceId(payload.activeWorkspace.id);
    }
    return payload;
  },
  register: async (input: {
    name: string;
    email: string;
    password: string;
    workspaceName?: string;
    region?: string;
    locale?: "ar" | "en";
    industry?: string;
  }): Promise<AuthPayload> => {
    const payload = (await http.post("/auth/register", input)).data;
    setStoredAuthSession(payload.session);
    if (payload.activeWorkspace?.id) {
      setStoredWorkspaceId(payload.activeWorkspace.id);
    }
    return payload;
  },
  me: async (): Promise<AuthPayload> => (await http.get("/auth/me")).data,
  bootstrapBorn2Hike: async (input: {
    email?: string;
    password?: string;
    name?: string;
  } = {}): Promise<{
    email: string;
    password: string;
    user: AuthUser;
    workspace: Workspace;
    bootstrap: unknown;
    warnings: string[];
  }> => (await http.post("/auth/bootstrap-born2hike", input)).data,
  logout: () => {
    clearStoredAuth();
  },
};

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export const workspacesApi = {
  list: async (): Promise<Workspace[]> => (await http.get("/workspaces")).data,
  current: async (): Promise<Workspace> =>
    (await http.get("/workspaces/current")).data,
  create: async (input: {
    name: string;
    slug?: string;
    region_default?: string;
    locale_default?: "ar" | "en";
    industry?: string;
  }): Promise<Workspace> => (await http.post("/workspaces", input)).data,
  getById: async (id: string): Promise<Workspace> =>
    (await http.get(`/workspaces/${id}`)).data,
  businessProfile: async (id: string): Promise<BusinessProfile> =>
    (await http.get(`/workspaces/${id}/business-profile`)).data,
  updateBusinessProfile: async (
    id: string,
    input: Partial<BusinessProfile>,
  ): Promise<BusinessProfile> =>
    (await http.patch(`/workspaces/${id}/business-profile`, input)).data,
  applyBorn2HikeProfile: async (id: string): Promise<BusinessProfile> =>
    (await http.post(`/workspaces/${id}/business-profile/born2hike`, {})).data,
  demoBootstrap: async (
    id?: string,
  ): Promise<{
    workspaceId: string;
    workspaceName: string;
    accountsConnected: { id: string; provider: string; handle: string }[];
    postsSynced: number;
    metricsRecorded: number;
    insightsGenerated: number;
    recommendationsInserted: number;
    warnings: string[];
  }> => {
    const url = id ? `/workspaces/${id}/demo-bootstrap` : `/workspaces/demo-bootstrap`;
    return (await http.post(url, {})).data;
  },
};

export const trendIntelligenceApi = {
  get: async (
    workspaceId: string,
    params: {
      scope?: "micro" | "macro" | "all";
      limit?: number;
      brand_id?: string;
    } = {},
  ): Promise<TrendIntelligenceResponse> =>
    (
      await http.get(`/workspaces/${workspaceId}/trend-intelligence`, {
        params,
      })
    ).data,
};

export const hashtagTrendsApi = {
  list: async (): Promise<HashtagTrendResponse> =>
    (await http.get("/hashtags")).data,
  search: async (q: string): Promise<HashtagSearchResponse> =>
    (await http.get("/hashtags/search", { params: { q } })).data,
  create: async (input: {
    tag: string;
    platform?: string;
    display_name?: string;
    refresh?: boolean;
    limit?: number;
  }): Promise<TrackedHashtag> => (await http.post("/hashtags", input)).data,
  refresh: async (
    id: string,
    input: { limit?: number } = {},
  ): Promise<{ hashtag: TrackedHashtag; warnings: string[] }> =>
    (await http.post(`/hashtags/${id}/refresh`, input)).data,
  remove: async (id: string): Promise<{ id: string; deleted: true }> =>
    (await http.delete(`/hashtags/${id}`)).data,
  snapshots: async (
    id: string,
    params: { limit?: number } = {},
  ): Promise<TrackedHashtag> =>
    (await http.get(`/hashtags/${id}/snapshots`, { params })).data,
};

// ---------------------------------------------------------------------------
// Social accounts
// ---------------------------------------------------------------------------

export const socialAccountsApi = {
  list: async (): Promise<SocialAccount[]> =>
    (await http.get("/social-accounts")).data,
  getById: async (id: string): Promise<SocialAccount> =>
    (await http.get(`/social-accounts/${id}`)).data,
  connectMeta: async (input: {
    kind: "instagram" | "facebook";
    handle?: string;
    displayName?: string;
  }): Promise<SocialAccount> =>
    (await http.post("/social-accounts/connect/meta", input)).data,
  sync: async (
    id: string,
    input: { limit?: number; daysBack?: number } = {},
  ): Promise<{
    accountId: string;
    provider: string;
    postsSynced: number;
    metricsRecorded: number;
    syncedAt: string;
  }> => (await http.post(`/social-accounts/${id}/sync`, input)).data,
  remove: async (id: string): Promise<{ id: string; deleted: true }> =>
    (await http.delete(`/social-accounts/${id}`)).data,
};

// ---------------------------------------------------------------------------
// Social posts (social_posts table — Apify-scraped + future OAuth)
// ---------------------------------------------------------------------------

export type SocialPostMetrics = {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  impressions: number;
  reach: number;
  engagement_rate: number | null;
  snapshot_time: string;
};

export type SocialPost = {
  id: string;
  social_account_id: string;
  platform_post_id: string;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  permalink: string | null;
  published_at: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  social_accounts: { handle: string; display_name: string | null; provider: string } | null;
  latest_metrics: SocialPostMetrics | null;
};

export const socialPostsApi = {
  list: async (params: {
    socialAccountId?: string;
    mediaType?: string;
    limit?: number;
  } = {}): Promise<SocialPost[]> =>
    (await http.get("/social-posts", { params })).data,
  refresh: async (input: { limit?: number } = {}): Promise<{
    posts_imported: number;
    account_id: string;
    warnings: string[];
  }> => (await http.post("/social-posts/refresh", input)).data,
};

// ---------------------------------------------------------------------------
// Synced posts
// ---------------------------------------------------------------------------

export const syncedPostsApi = {
  list: async (params: {
    socialAccountId?: string;
    lang?: "ar" | "en" | "mixed";
    postType?: string;
    limit?: number;
  } = {}): Promise<SyncedPost[]> =>
    (await http.get("/synced-posts", { params })).data,
  getById: async (id: string): Promise<SyncedPost> =>
    (await http.get(`/synced-posts/${id}`)).data,
  metrics: async (
    id: string,
    params: { from?: string; to?: string; limit?: number } = {},
  ): Promise<PostMetric[]> =>
    (await http.get(`/synced-posts/${id}/metrics`, { params })).data,
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export const analyticsApi = {
  overview: async (): Promise<AnalyticsOverview> =>
    (await http.get("/analytics/overview")).data,
  timeseries: async (
    params: { metric?: "engagement" | "reach" | "impressions"; groupBy?: "day" | "week" } = {},
  ): Promise<AnalyticsTimeseries> =>
    (await http.get("/analytics/timeseries", { params })).data,
  platformBreakdown: async (): Promise<PlatformBreakdown> =>
    (await http.get("/analytics/platform-breakdown")).data,
  sentimentBreakdown: async (): Promise<SentimentBreakdown> =>
    (await http.get("/analytics/sentiment-breakdown")).data,
  topPosts: async (
    params: {
      limit?: number;
      sortBy?: "engagement" | "reach" | "impressions" | "engagement_rate";
    } = {},
  ): Promise<TopPost[]> =>
    (await http.get("/analytics/top-posts", { params })).data,
};

// ---------------------------------------------------------------------------
// Audience insights
// ---------------------------------------------------------------------------

export type AudienceInsightRow = {
  value: number;
  share?: number | null;
};

export type AudienceInsightsPayload = {
  source: "meta_graph";
  generated_at: string;
  window_days: number;
  account: {
    id: string;
    handle: string | null;
    display_name: string | null;
    provider: string;
    last_synced_at: string | null;
  } | null;
  kpis: {
    followers: number | null;
    follower_delta: number | null;
    reach: number;
    impressions: number;
    engaged_accounts: number;
    profile_views: number;
    posts_analyzed: number;
  };
  follower_growth: Array<{
    date: string;
    followers: number;
    following: number;
  }>;
  active_times: {
    source: "meta_graph" | "derived_from_posts" | "unavailable";
    by_hour: Array<{ hour: number; score: number; posts?: number }>;
    by_day: Array<{ day: string; score: number; posts?: number }>;
  };
  gender_distribution: Array<AudienceInsightRow & { gender: string }>;
  age_ranges: Array<AudienceInsightRow & { range: string }>;
  top_cities: Array<AudienceInsightRow & { name: string }>;
  top_countries: Array<AudienceInsightRow & { name: string }>;
  content_response: Array<{ format: string; avg_engagement: number; posts: number }>;
  sentiment_distribution?: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
    avg_confidence: number | null;
    coverage: number;
  };
  sentiment_source?: "comments" | "captions" | "unavailable";
  comments_analyzed?: number;
  caption_sentiment_distribution?: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
    avg_confidence: number | null;
    coverage: number;
  };
  comment_sentiment_distribution?: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
    avg_confidence: number | null;
    coverage: number;
  };
  sentiment_samples?: Array<{
    id: string;
    caption: string;
    permalink: string | null;
    published_at: string | null;
    source?: "comments" | "captions";
    post_caption?: string | null;
    author?: string | null;
    sentiment: "positive" | "neutral" | "negative";
    confidence: number;
  }>;
  caption_sentiment_samples?: Array<{
    id: string;
    caption: string;
    permalink: string | null;
    published_at: string | null;
    source?: "comments" | "captions";
    post_caption?: string | null;
    author?: string | null;
    sentiment: "positive" | "neutral" | "negative";
    confidence: number;
  }>;
  comment_sentiment_samples?: Array<{
    id: string;
    caption: string;
    permalink: string | null;
    published_at: string | null;
    source?: "comments" | "captions";
    post_caption?: string | null;
    author?: string | null;
    sentiment: "positive" | "neutral" | "negative";
    confidence: number;
  }>;
  ai_insights?: Array<{
    kind: "growth" | "demographic" | "geo" | "timing" | "content" | "sentiment";
    text: string;
  }>;
  warnings: string[];
  refresh?: {
    posts_imported: number;
    metrics_snapshots_inserted: number;
    comments_imported?: number;
    warnings: string[];
  };
};

export const audienceInsightsApi = {
  get: async (params: { days?: number } = {}): Promise<AudienceInsightsPayload> =>
    (await http.get("/audience-insights", { params })).data,
  refresh: async (input: { limit?: number } = {}): Promise<AudienceInsightsPayload> =>
    (await http.post("/audience-insights/refresh", input)).data,
};

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export const inboxApi = {
  list: async (
    params: {
      type?: "all" | "comment" | "message";
      status?: "all" | "unread" | "read" | "replied" | "archived" | "failed";
      limit?: number;
    } = {},
  ): Promise<InboxItem[]> => (await http.get("/inbox", { params })).data,
  summary: async (): Promise<InboxSummary> => (await http.get("/inbox/summary")).data,
  sync: async (input: { limit?: number } = {}): Promise<{
    comments_imported: number;
    messages_imported: number;
    warnings: string[];
  }> => (await http.post("/inbox/sync", input)).data,
  markStatus: async (
    id: string,
    status: "unread" | "read" | "replied" | "archived",
  ): Promise<InboxItem> => (await http.patch(`/inbox/${id}/status`, { status })).data,
  reply: async (
    id: string,
    message: string,
  ): Promise<{ inbound: InboxItem; outbound: InboxItem }> =>
    (await http.post(`/inbox/${id}/reply`, { message })).data,
};

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export const insightsApi = {
  list: async (
    params: {
      scopeType?: string;
      insightType?: string;
      severity?: string;
      limit?: number;
    } = {},
  ): Promise<Insight[]> => (await http.get("/insights", { params })).data,
  generate: async (): Promise<Insight[]> =>
    (await http.post("/insights/generate", {})).data,
};

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export const recommendationsApi = {
  mena: async (input: {
    platform: string;
    region: string;
    contentType?: string;
    budget?: number;
    audienceSize?: number;
  }): Promise<MenaRecommendation> =>
    (await http.post("/recommendations/mena", input)).data,
};

// ---------------------------------------------------------------------------
// Campaigns + analysis/prediction (v1 surface, kept compatible)
// ---------------------------------------------------------------------------

export const campaignsApi = {
  list: async (params: { limit?: number } = {}): Promise<Campaign[]> =>
    (await http.get("/campaigns", { params })).data,
  getById: async (id: string): Promise<CampaignWithRelations> =>
    (await http.get(`/campaigns/${id}`)).data,
  create: async (input: {
    user_id: string;
    campaign_name: string;
    platform: string;
    budget: number;
    audience_size?: number;
    content_type?: string;
    posting_time?: string;
    region?: string;
  }): Promise<Campaign> => (await http.post("/campaigns", input)).data,
};

// ---------------------------------------------------------------------------
// Meta Ads Manager  (/api/campaigns/meta-ads/*)
// ---------------------------------------------------------------------------

export type MetaAdsStatus = "live" | "not_implemented" | "live_error";

export type MetaAdAccount = {
  id: string;
  name: string;
  currency: string;
  account_status: number;
  timezone_name: string;
};

export type MetaAdsCampaign = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  effective_status: string;
  objective: string;
  buying_type: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
  created_time: string;
  updated_time: string;
};

export type MetaAdset = {
  id: string;
  name: string;
  campaign_id: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_amount?: string;
  optimization_goal: string;
  billing_event: string;
  targeting: Record<string, unknown>;
  start_time?: string;
  end_time?: string;
  created_time: string;
  updated_time: string;
};

export type MetaAdCreative = {
  id: string;
  name: string;
  object_story_spec?: Record<string, unknown>;
  body?: string | null;
  title?: string | null;
  call_to_action_type?: string | null;
  created_time: string;
  updated_time: string;
};

export type MetaAdsListResponse<T> = {
  _status: MetaAdsStatus;
  _note?: string;
  _errorMessage?: string;
  data: T[];
  paging?: { cursors: { before: string; after: string }; next?: string };
};

export type MetaAdsSingleResponse<T> = {
  _status: MetaAdsStatus;
  _note?: string;
  _errorMessage?: string;
  data: T | null;
};

export type MetaAdsMutationResponse = {
  _status: MetaAdsStatus;
  _note?: string;
  _errorMessage?: string;
  data: { id?: string; success?: boolean } | null;
};

export type CreateMetaCampaignInput = {
  adAccountId: string;
  name: string;
  objective: string;
  status?: "ACTIVE" | "PAUSED";
  buyingType?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  startTime?: string;
  endTime?: string;
  specialAdCategories?: string[];
};

export type UpdateMetaCampaignInput = {
  name?: string;
  status?: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  dailyBudget?: number;
  lifetimeBudget?: number;
  startTime?: string;
  endTime?: string;
};

export type CreateAdsetInput = {
  adAccountId: string;
  campaignId: string;
  name: string;
  optimizationGoal: string;
  billingEvent: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  bidAmount?: number;
  targeting: Record<string, unknown>;
  status?: "ACTIVE" | "PAUSED";
  startTime?: string;
  endTime?: string;
};

export type CreateCreativeInput = {
  adAccountId: string;
  name: string;
  objectStorySpec: {
    pageId: string;
    linkData: {
      link: string;
      message: string;
      name?: string;
      description?: string;
      imageHash?: string;
      callToAction?: { type: string; link: string };
    };
  };
};

export const metaAdsApi = {
  // Ad Accounts
  accounts: async (): Promise<MetaAdsListResponse<MetaAdAccount>> =>
    (await http.get("/campaigns/meta-ads/accounts")).data,

  // Campaigns
  listCampaigns: async (params: {
    adAccountId: string;
    effectiveStatus?: string;
  }): Promise<MetaAdsListResponse<MetaAdsCampaign>> =>
    (await http.get("/campaigns/meta-ads", { params })).data,

  getCampaign: async (id: string): Promise<MetaAdsSingleResponse<MetaAdsCampaign>> =>
    (await http.get(`/campaigns/meta-ads/${id}`)).data,

  createCampaign: async (
    input: CreateMetaCampaignInput,
  ): Promise<MetaAdsMutationResponse> =>
    (await http.post("/campaigns/meta-ads", input)).data,

  updateCampaign: async (
    id: string,
    patch: UpdateMetaCampaignInput,
  ): Promise<MetaAdsMutationResponse> =>
    (await http.patch(`/campaigns/meta-ads/${id}`, patch)).data,

  deleteCampaign: async (id: string): Promise<MetaAdsMutationResponse> =>
    (await http.delete(`/campaigns/meta-ads/${id}`)).data,

  // Ad Sets
  listAdsets: async (
    campaignId: string,
  ): Promise<MetaAdsListResponse<MetaAdset>> =>
    (await http.get(`/campaigns/meta-ads/${campaignId}/adsets`)).data,

  createAdset: async (
    campaignId: string,
    input: CreateAdsetInput,
  ): Promise<MetaAdsMutationResponse> =>
    (await http.post(`/campaigns/meta-ads/${campaignId}/adsets`, input)).data,

  updateAdset: async (
    adsetId: string,
    patch: Partial<CreateAdsetInput>,
  ): Promise<MetaAdsMutationResponse> =>
    (await http.patch(`/campaigns/meta-ads/adsets/${adsetId}`, patch)).data,

  deleteAdset: async (adsetId: string): Promise<MetaAdsMutationResponse> =>
    (await http.delete(`/campaigns/meta-ads/adsets/${adsetId}`)).data,

  // Ad Creatives
  listCreatives: async (params: {
    adAccountId: string;
  }): Promise<MetaAdsListResponse<MetaAdCreative>> =>
    (await http.get("/campaigns/meta-ads/creatives", { params })).data,

  getCreative: async (
    creativeId: string,
  ): Promise<MetaAdsSingleResponse<MetaAdCreative>> =>
    (await http.get(`/campaigns/meta-ads/creatives/${creativeId}`)).data,

  createCreative: async (
    input: CreateCreativeInput,
  ): Promise<MetaAdsMutationResponse> =>
    (await http.post("/campaigns/meta-ads/creatives", input)).data,

  deleteCreative: async (creativeId: string): Promise<MetaAdsMutationResponse> =>
    (await http.delete(`/campaigns/meta-ads/creatives/${creativeId}`)).data,
};

export const analyzeApi = {
  sentiment: async (input: {
    postId: string;
    text: string;
  }): Promise<SentimentResult> =>
    (await http.post("/analyze/sentiment", input)).data,
};

export const predictApi = {
  roi: async (input: {
    campaignId: string;
    budget: number;
    platform: string;
    contentType: string;
    audienceSize: number;
    postingHour: number;
    sentimentScore: number;
    holidayFlag: number;
    region: string;
  }): Promise<RoiResult> => (await http.post("/predict/roi", input)).data,
};

// ---------------------------------------------------------------------------
// Platform integrations (capability matrix)
// ---------------------------------------------------------------------------

export type IntegrationsCapabilitiesResponse = {
  architecture: {
    mode: string;
    providerRegistry?: string;
    integrationLayer?: string;
    oauthEnabled: boolean;
    notes?: string;
  };
  methods: string[];
  platforms: PlatformCapability[];
  registeredProviders: string[];
};

export const integrationsApi = {
  capabilities: async (): Promise<IntegrationsCapabilitiesResponse> =>
    (await http.get("/integrations/platform-capabilities")).data,
};

// ---------------------------------------------------------------------------
// OAuth (Meta Graph v19)
// ---------------------------------------------------------------------------

export const oauthApi = {
  metaStatus: async (): Promise<OAuthStatus> =>
    (await http.get("/oauth/meta/status")).data,
  metaInit: async (
    redirectAfter?: string,
  ): Promise<{ authorization_url: string }> =>
    (
      await http.get("/oauth/meta/init", {
        params: {
          format: "json",
          redirect_after: redirectAfter,
        },
      })
    ).data,
  metaSync: async (): Promise<{
    connection: { id: string; status: string };
    sync: { accounts_synced: number; pages: number };
  }> => (await http.post("/oauth/meta/sync")).data,
};

export const healthApi = {
  check: async (): Promise<HealthCheck> => (await http.get("/health")).data,
};

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export type CompetitorDiscoveryInput = {
  platform?: Provider;
  category?: string;
  location?: string;
  page_name?: string;
  keywords?: string[];
  hashtags?: string[];
  audience_size?: string | number;
  limit?: number;
};

export type ManualCompetitorInput = {
  platform?: Provider;
  handle: string;
  display_name?: string;
  profile_url?: string;
  region?: string;
  industry?: string;
  tags?: string[];
};

export const competitorsApi = {
  list: async (params?: {
    platform?: Provider;
    include_inactive?: boolean;
  }): Promise<CompetitorAccount[]> =>
    (
      await http.get("/competitors", {
        params: {
          platform: params?.platform,
          include_inactive: params?.include_inactive ? "true" : undefined,
        },
      })
    ).data,
  candidates: async (params?: {
    status?: "pending" | "approved" | "rejected" | "all";
    limit?: number;
  }): Promise<CompetitorCandidate[]> =>
    (await http.get("/competitors/candidates", { params })).data,
  discover: async (
    input: CompetitorDiscoveryInput,
  ): Promise<CompetitorDiscoveryResponse> =>
    (await http.post("/competitors/discover", input)).data,
  manualAdd: async (
    input: ManualCompetitorInput,
  ): Promise<{
    competitor: CompetitorAccount;
    candidate: CompetitorCandidate;
    posts_imported?: number;
    metrics_snapshots_inserted?: number;
    warnings: string[];
  }> =>
    (await http.post("/competitors", input)).data,
  approve: async (
    id: string,
  ): Promise<{
    competitor: CompetitorAccount;
    candidate: CompetitorCandidate;
    posts_imported?: number;
    metrics_snapshots_inserted?: number;
    warnings?: string[];
  }> =>
    (await http.post(`/competitors/candidates/${id}/approve`)).data,
  reject: async (id: string): Promise<CompetitorCandidate> =>
    (await http.post(`/competitors/candidates/${id}/reject`)).data,
  refresh: async (
    id: string,
  ): Promise<{
    competitor: CompetitorAccount;
    snapshot: unknown;
    posts_imported?: number;
    metrics_snapshots_inserted?: number;
    warnings: string[];
  }> =>
    (await http.post(`/competitors/${id}/refresh`)).data,
  refreshAll: async (): Promise<{
    refreshed_count: number;
    posts_imported: number;
    metrics_snapshots_inserted: number;
    results: Array<{
      competitor_id: string;
      handle: string;
      platform: Provider;
      posts_imported: number;
      metrics_snapshots_inserted: number;
      warnings: string[];
    }>;
    warnings: string[];
  }> =>
    (await http.post("/competitors/refresh-all")).data,
  remove: async (id: string): Promise<CompetitorAccount> =>
    (await http.delete(`/competitors/${id}`)).data,
  summary: async (): Promise<{
    approved_count: number;
    pending_count: number;
    rejected_count: number;
    approved: CompetitorAccount[];
    pending: CompetitorCandidate[];
  }> => (await http.get("/competitors/summary")).data,
  comparison: async (windowDays = 30): Promise<CompetitorComparisonResponse> =>
    (
      await http.get("/competitors/comparison", {
        params: { window_days: windowDays },
      })
    ).data,
};

// ---------------------------------------------------------------------------
// Assistant (chat + streaming)
// ---------------------------------------------------------------------------

export type AssistantConversation = {
  id: string;
  workspace_id: string;
  title: string | null;
  feature: "assistant" | "report_narrative" | "other";
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AssistantMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type AssistantStreamFrame =
  | { type: "conversation"; conversationId: string | null }
  | { type: "token"; delta: string }
  | { type: "error"; code: string; message: string }
  | {
      type: "done";
      message?: AssistantMessage | Record<string, unknown>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      model?: string | null;
      costUSD?: number;
    };

export type AssistantStreamCallbacks = {
  onConversation?: (conversationId: string | null) => void;
  onToken?: (delta: string) => void;
  onError?: (code: string, message: string) => void;
  onDone?: (frame: Extract<AssistantStreamFrame, { type: "done" }>) => void;
};

/**
 * POST /api/assistant/chat with Server-Sent Events.
 * Returns an AbortController the caller can use to cancel mid-stream.
 */
export function streamAssistantChat(
  input: { message: string; conversationId?: string | null; locale?: "en" | "ar" },
  callbacks: AssistantStreamCallbacks = {},
): { done: Promise<void>; abort: () => void } {
  const controller = new AbortController();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  const wsid = readWorkspaceId();
  if (wsid) headers["x-workspace-id"] = wsid;

  const done = (async () => {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/assistant/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      callbacks.onError?.(
        "NETWORK",
        err instanceof Error ? err.message : "Network error",
      );
      return;
    }

    if (!response.ok || !response.body) {
      try {
        const json = await response.json();
        const e = json?.error || { code: "HTTP", message: response.statusText };
        callbacks.onError?.(e.code || "HTTP", e.message || "Request failed");
      } catch {
        callbacks.onError?.("HTTP", `HTTP ${response.status}`);
      }
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handleFrame = (event: string, data: string) => {
      let payload: AssistantStreamFrame | null = null;
      try {
        payload = data ? (JSON.parse(data) as AssistantStreamFrame) : null;
      } catch {
        return;
      }
      if (!payload) return;

      switch (payload.type) {
        case "conversation":
          callbacks.onConversation?.(payload.conversationId);
          break;
        case "token":
          callbacks.onToken?.(payload.delta);
          break;
        case "error":
          callbacks.onError?.(payload.code, payload.message);
          break;
        case "done":
          callbacks.onDone?.(payload);
          break;
        default:
          // ignore unknown events (end, ping, etc.)
          break;
      }
      // `event` captured for future use (e.g. ping). Currently unused.
      void event;
    };

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIdx = buffer.indexOf("\n\n");
        while (sepIdx !== -1) {
          const raw = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);

          let evName = "message";
          const dataLines: string[] = [];
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) evName = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
          }
          handleFrame(evName, dataLines.join("\n"));
          sepIdx = buffer.indexOf("\n\n");
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      callbacks.onError?.(
        "STREAM",
        err instanceof Error ? err.message : "Stream error",
      );
    }
  })();

  return { done, abort: () => controller.abort() };
}

export const assistantApi = {
  streamChat: streamAssistantChat,
  listConversations: async (): Promise<AssistantConversation[]> =>
    (await http.get("/assistant/conversations")).data,
  listMessages: async (conversationId: string): Promise<AssistantMessage[]> =>
    (await http.get(`/assistant/conversations/${conversationId}/messages`)).data,
};

// ---------------------------------------------------------------------------
// Growth Report
// ---------------------------------------------------------------------------

export type GrowthReportNarrative = {
  executive_summary_en: string;
  executive_summary_ar: string;
  highlights: Array<{ label_en: string; label_ar: string; value: string }>;
  recommended_actions_en: string[];
  recommended_actions_ar: string[];
  _source?: "llm" | "fallback";
  _llm_error?: string;
};

export type GrowthReportAccountRow = {
  social_account_id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  status: string;
  last_synced_at: string | null;
  followers_count: number;
  following_count?: number;
  profile_views?: number;
  audience_captured_at?: string | null;
  posts_count: number;
};

export type GrowthReportPlatformRow = {
  provider: string;
  posts: number;
  reach: number;
  impressions: number;
  engagements: number;
};

export type GrowthReportTopPost = {
  id: string;
  social_account_id: string;
  caption: string | null;
  post_type?: string | null;
  permalink?: string | null;
  posted_at: string | null;
  score: number;
  engagement: number;
  latest_metrics?: Record<string, number | null> | null;
};

export type GrowthReportAggregate = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    region_default: string | null;
    locale_default: string | null;
    industry_hint: string | null;
    primary_region: string | null;
  } | null;
  totals: Record<string, number> | null;
  syncJobs: Record<string, number> | null;
  accountsBreakdown: GrowthReportAccountRow[];
  overview: AnalyticsOverview | null;
  platform: GrowthReportPlatformRow[];
  sentiment: SentimentBreakdown | null;
  topPosts: GrowthReportTopPost[];
  insights: Array<{
    type: string;
    title: string;
    summary: string;
    severity: string;
  }>;
  recommendations: Array<{
    type: string;
    title: string;
    description: string | null;
    priority: string;
  }>;
  warnings: string[];
};

export type GrowthReport = {
  workspace_id: string;
  report_type: "growth";
  locale: "en" | "ar";
  generated_at: string;
  aggregate: GrowthReportAggregate;
  narrative: GrowthReportNarrative;
};

export type ReportShare = {
  id: string;
  token: string;
  report_type: "growth";
  locale: "en" | "ar";
  created_at: string;
  expires_at: string | null;
  revoked?: boolean;
};

export type SharedGrowthReport = {
  token: string;
  report_type: "growth";
  locale: "en" | "ar";
  created_at: string;
  expires_at: string | null;
  report: GrowthReport;
};

// ---------------------------------------------------------------------------
// Scheduled posts + MENA calendar
// ---------------------------------------------------------------------------

export type ScheduledPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type ScheduledPost = {
  id: string;
  workspace_id: string;
  social_account_id: string | null;
  platform: string;
  caption: string;
  language: "ar" | "en" | "mix" | null;
  dialect: string | null;
  media_urls: string[];
  hashtags: string[];
  scheduled_at: string;
  status: ScheduledPostStatus;
  published_at: string | null;
  external_post_id: string | null;
  error_message: string | null;
  content_score_json: Record<string, unknown>;
  mena_event_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MenaEvent = {
  id: string;
  workspace_id: string | null;
  slug: string;
  title_en: string;
  title_ar: string | null;
  event_date: string; // YYYY-MM-DD
  event_type: "holiday" | "religious" | "shopping" | "local" | "custom";
  region: string | null;
  description_en: string | null;
  description_ar: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type CalendarResponse = {
  range: { from: string; to: string };
  events: MenaEvent[];
  scheduled_posts: ScheduledPost[];
  warnings: string[];
};

export type CreateScheduledPostInput = {
  social_account_id?: string | null;
  platform: string;
  caption: string;
  language?: "ar" | "en" | "mix" | null;
  dialect?: string | null;
  media_urls?: string[];
  hashtags?: string[];
  scheduled_at: string;
  status?: ScheduledPostStatus;
  mena_event_id?: string | null;
  content_score_json?: Record<string, unknown>;
  metadata_json?: Record<string, unknown>;
};

export const scheduledPostsApi = {
  list: async (params?: {
    status?: string | string[];
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<ScheduledPost[]> =>
    (await http.get("/scheduled-posts", { params })).data,
  get: async (id: string): Promise<ScheduledPost> =>
    (await http.get(`/scheduled-posts/${id}`)).data,
  create: async (input: CreateScheduledPostInput): Promise<ScheduledPost> =>
    (await http.post("/scheduled-posts", input)).data,
  update: async (
    id: string,
    input: Partial<CreateScheduledPostInput>,
  ): Promise<ScheduledPost> =>
    (await http.patch(`/scheduled-posts/${id}`, input)).data,
  cancel: async (id: string): Promise<ScheduledPost> =>
    (await http.post(`/scheduled-posts/${id}/cancel`, {})).data,
  remove: async (id: string): Promise<{ id: string; deleted: boolean }> =>
    (await http.delete(`/scheduled-posts/${id}`)).data,
  publishNow: async (): Promise<{
    claimed: number;
    published: number;
    failed: number;
    rows: Array<{ id: string; status: string; error?: string }>;
  }> => (await http.post("/scheduled-posts/publish-now", {})).data,
  calendar: async (params?: {
    from?: string;
    to?: string;
    region?: string;
  }): Promise<CalendarResponse> =>
    (await http.get("/workspaces/current/calendar", { params })).data,
};

export const reportsApi = {
  growth: async (locale: "en" | "ar" = "en"): Promise<GrowthReport> =>
    (await http.get("/reports/growth", { params: { locale } })).data,
  share: async (input: {
    locale?: "en" | "ar";
    expiresInDays?: number | null;
  } = {}): Promise<ReportShare> =>
    (await http.post("/reports/growth/share", input)).data,
  listShares: async (): Promise<ReportShare[]> =>
    (await http.get("/reports/shares")).data,
  revokeShare: async (shareId: string): Promise<{ id: string; revoked: boolean }> =>
    (await http.delete(`/reports/shares/${shareId}`)).data,
  getShared: async (token: string): Promise<SharedGrowthReport> => {
    // Public route: skip workspace header so we don't leak context.
    const client = axios.create({ baseURL: BASE_URL });
    return (await client.get(`/reports/shared/${token}`)).data;
  },
};

