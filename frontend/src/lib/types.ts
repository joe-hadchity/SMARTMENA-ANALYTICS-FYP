export type Locale = "ar" | "en";

export type Dialect =
  | "khaleeji"
  | "levantine"
  | "egyptian"
  | "maghrebi"
  | "msa";

export type BrandVoice = {
  tone_keywords: string[];
  do: string[];
  dont: string[];
  sample_phrases: string[];
  default_dialect: Dialect;
};

export type WorkspaceBrandVoice = {
  workspace_id: string;
  name: string;
  industry_hint: string | null;
  primary_region: string | null;
  brand_voice: BrandVoice;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  region_default: string | null;
  locale_default: Locale;
  owner_user_id: string | null;
  created_at: string;
  industry_hint?: string | null;
  primary_region?: string | null;
  brand_voice_json?: BrandVoice | null;
};

export type HealthCheck = {
  status: string;
  service: string;
  uptime: number;
  timestamp: string;
  features?: {
    llm?: {
      enabled: boolean;
      provider: string;
      deployment: string | null;
      apiVersion: string | null;
      monthlyTokenBudget: number;
    };
  };
};

export type Provider =
  | "meta_instagram"
  | "meta_facebook"
  | "tiktok"
  | "x";

export type SocialAccount = {
  id: string;
  workspace_id: string;
  provider: Provider;
  external_account_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  status: "connected" | "disconnected" | "error";
  is_mock: boolean;
  connected_at: string;
  last_synced_at: string | null;
  metadata: Record<string, unknown>;
};

export type PostType =
  | "image"
  | "video"
  | "carousel"
  | "reel"
  | "story"
  | "text";

export type CaptionLang = "ar" | "en" | "mixed";

export type PostMetricsSnapshot = {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  impressions: number;
  reach: number;
  video_views: number;
  engagement_rate: number | null;
  captured_at: string;
};

export type SyncedPost = {
  id: string;
  workspace_id: string;
  social_account_id: string;
  external_post_id: string;
  post_type: PostType | null;
  caption: string | null;
  caption_lang: CaptionLang | null;
  media_url: string | null;
  permalink: string | null;
  posted_at: string | null;
  fetched_at: string;
  latest_metrics: PostMetricsSnapshot | null;
};

export type PostMetric = {
  id: string;
  synced_post_id: string;
  captured_at: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  impressions: number;
  reach: number;
  video_views: number;
  engagement_rate: number | null;
};

export type AnalyticsOverview = {
  totals: {
    connectedAccounts: number;
    syncedPosts: number;
    campaigns: number;
    predictions: number;
    sentimentResults: number;
    reach: number;
    impressions: number;
    engagements: number;
  };
  averages: {
    engagementRate: number | null;
    sentimentScore: number | null;
    predictedRoi: number | null;
  };
};

export type AnalyticsTimeseries = {
  metric: "engagement" | "reach" | "impressions";
  groupBy: "day" | "week";
  points: { bucket: string; value: number; samples: number }[];
};

export type PlatformBreakdown = {
  provider: Provider;
  posts: number;
  reach: number;
  impressions: number;
  engagements: number;
}[];

export type SentimentBreakdown = {
  total: number;
  counts: { positive: number; neutral: number; negative: number };
  shares: { positive: number; neutral: number; negative: number };
  avgConfidence: number | null;
};

export type TopPost = SyncedPost & { score: number; engagement: number };

export type Insight = {
  id: string;
  workspace_id: string;
  scope_type: "workspace" | "campaign" | "social_account" | "synced_post";
  scope_id: string | null;
  insight_type:
    | "sentiment_summary"
    | "performance_anomaly"
    | "content_recommendation"
    | "best_posting_time"
    | "mena_trend";
  title_ar: string | null;
  title_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  severity: "info" | "warning" | "opportunity";
  confidence: number | null;
  data: Record<string, unknown>;
  model_version: string;
  generated_at: string;
};

export type MenaRecommendation = {
  region: string;
  platform: string;
  bestPostingWindows: {
    startHour: number;
    endHour: number;
    label_en: string;
    label_ar: string;
  }[];
  languageMix: {
    arabicPct: number;
    englishPct: number;
    mixedBonusPct: number;
    guidance_en: string;
    guidance_ar: string;
  };
  nearestEvent: {
    id: string;
    name_en: string;
    name_ar: string;
    type: string;
    startDate: string;
    endDate: string;
    distanceDays: number;
    notes_en: string;
    notes_ar: string;
  } | null;
  holidayFlag: 0 | 1;
  suggestedPostingHour: number;
  roiForecast: {
    predictedRoi: number | null;
    predictedEngagement: number | null;
    confidenceScore: number | null;
    roiLow: number | null;
    roiHigh: number | null;
    unavailableReason?: string;
  };
};

export type Campaign = {
  id: string;
  workspace_id: string | null;
  user_id: string;
  campaign_name: string;
  platform: string;
  budget: number;
  audience_size: number | null;
  content_type: string | null;
  posting_time: string | null;
  region: string | null;
  created_at: string;
};

export type Prediction = {
  id: string;
  campaign_id: string;
  predicted_roi: number;
  predicted_engagement: number;
  confidence_score: number;
  created_at: string;
};

export type CampaignWithRelations = Campaign & {
  posts: {
    id: string;
    text_content: string;
    language: string;
    created_at: string;
  }[];
  predictions: Prediction[];
  latest_prediction: Prediction | null;
};

export type CapabilityStatus =
  | "live"
  | "live_ready"
  | "mock_ready"
  | "stubbed"
  | "planned"
  | "not_supported";

export type PlatformCapability = {
  key: "meta" | "tiktok" | "x" | string;
  displayName: string;
  platforms: Provider[];
  status: CapabilityStatus;
  priority: number;
  authModel: string;
  plannedScopes: string[];
  methods: Record<string, CapabilityStatus>;
  features: Record<string, CapabilityStatus>;
  rateLimits?: { note?: string; hourlyCallsPerToken?: number };
  limitations?: string;
  targetRelease?: string;
  runtimeMode?: "live" | "mock";
  oauth?: { initUrl?: string; callbackUrl?: string; statusUrl?: string };
};

export type OAuthStatus = {
  provider: "meta" | string;
  enabled: boolean;
  mode: "live" | "mock";
  graph_version?: string;
  redirect_uri?: string;
  scopes?: string[];
  missing?: string[];
};

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export type CompetitorSource =
  | "manual"
  | "ad_library"
  | "business_discovery"
  | "mock";

export type CompetitorAccount = {
  id: string;
  workspace_id: string;
  platform: Provider;
  handle: string;
  display_name: string | null;
  external_account_id: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  region: string | null;
  industry: string | null;
  tags: string[];
  source: CompetitorSource;
  is_active: boolean;
  last_scraped_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CompetitorPost = {
  id: string;
  competitor_account_id: string;
  platform_post_id: string;
  caption: string | null;
  caption_lang: CaptionLang | null;
  media_type: PostType | null;
  permalink: string | null;
  posted_at: string | null;
  fetched_at: string;
  hashtags: string[];
};

export type CompetitorAggregate = {
  window_days: number;
  generated_at: string;
  competitor_count: number;
  post_count: number;
  competitors: Array<{
    competitor_id: string;
    handle: string;
    display_name: string | null;
    platform: Provider;
    region: string | null;
    industry: string | null;
    post_count: number;
    followers_count: number | null;
    avg_engagement_rate: number | null;
    media_breakdown: Record<string, number>;
    language_breakdown: Record<string, number>;
    top_post: {
      caption: string | null;
      permalink: string | null;
      media_type: string | null;
      posted_at: string | null;
      engagement_total: number;
      caption_lang: string | null;
    } | null;
    hashtag_cloud: Array<{ tag: string; count: number }>;
  }>;
};

export type CompetitorDigestNarrative = {
  summary_en?: string;
  summary_ar?: string;
  highlights?: Array<{
    competitor_handle: string;
    headline_en: string;
    headline_ar: string;
    evidence: string;
  }>;
  suggested_moves_en?: string[];
  suggested_moves_ar?: string[];
};

export type CompetitorDigestRun = {
  id: string;
  workspace_id: string;
  period_start: string;
  period_end: string;
  status: "pending" | "running" | "succeeded" | "failed";
  summary_json: CompetitorAggregate | Record<string, unknown>;
  narrative_en: string | null;
  narrative_ar: string | null;
  highlights: CompetitorDigestNarrative["highlights"];
  competitor_count: number;
  post_count: number;
  delivery_status: "pending" | "skipped" | "sent" | "failed";
  delivery_target: string | null;
  delivery_message: string | null;
  llm_tokens_total: number | null;
  created_at: string;
  completed_at: string | null;
};

// ---------------------------------------------------------------------------
// Trend Radar (Phase 7 Layer 1)
// ---------------------------------------------------------------------------

export type TrendKind = "hashtag" | "topic" | "format" | "sound";
export type TrendSortBy = "volume" | "engagement" | "avg_engagement";
export type TrendSource = "own" | "competitor";

export type TrendSparklinePoint = {
  day: string; // YYYY-MM-DD
  post_count: number;
  engagement_sum: number;
};

export type TrendSample = {
  post_id: string;
  source: TrendSource;
  engagement: number;
  permalink: string | null;
  caption: string | null;
  day?: string;
};

export type TrendRow = {
  trend_term_id: string;
  kind: TrendKind;
  value: string;
  display_label: string | null;
  metadata: Record<string, unknown>;
  post_count: number;
  engagement_sum: number;
  engagement_avg: number;
  unique_authors: number;
  platform_breakdown: Record<string, number>;
  source_breakdown: Record<string, number>;
  last_active_day: string | null;
  prev_post_count: number;
  prev_engagement_sum: number;
  delta_post_count_pct: number;
  delta_engagement_pct: number;
  sparkline: TrendSparklinePoint[];
  samples: TrendSample[];
};

export type TrendsListResponse = {
  workspace_id: string;
  kind: TrendKind | "all";
  window_days: number;
  sort_by: TrendSortBy;
  count: number;
  trends: TrendRow[];
};

export type TrendDetail = {
  term: {
    id: string;
    workspace_id: string;
    kind: TrendKind;
    value: string;
    display_label: string | null;
    metadata: Record<string, unknown>;
    first_seen_at: string;
    last_seen_at: string;
  };
  window_days: number;
  sparkline: TrendSparklinePoint[];
  totals: {
    post_count: number;
    engagement_sum: number;
    unique_authors: number;
  };
  top_samples: TrendSample[];
};

export type TrendRebuildSummary = {
  workspace_id: string;
  window_days: number;
  post_count: number;
  own_posts: number;
  competitor_posts: number;
  term_count: number;
  snapshot_rows: number;
  elapsed_ms: number;
};

export type SentimentLabel = "positive" | "negative" | "neutral";

export type SentimentResult = {
  postId: string;
  sentiment: SentimentLabel;
  confidence: number;
};

export type RoiResult = {
  campaignId: string;
  predictedRoi: number;
  predictedEngagement: number;
  confidenceScore: number;
};
