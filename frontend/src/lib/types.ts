export type Locale = "ar" | "en";

export type Dialect =
  | "khaleeji"
  | "levantine"
  | "egyptian"
  | "maghrebi"
  | "msa";

export type BusinessProfile = {
  workspace_id: string | null;
  onboarding_completed: boolean;
  business_name: string;
  page_name: string;
  instagram_handle: string | null;
  category: string;
  business_type: string;
  location: string;
  country: string;
  website: string | null;
  bio: string;
  about: string;
  audience: string;
  keywords: string[];
  hashtags: string[];
  tone_keywords: string[];
  content_pillars: string[];
  goals: string[];
  platforms: string[];
  primary_platform: string;
  content_formats: string[];
  posting_frequency: string;
  do?: string[];
  dont?: string[];
  sample_phrases?: string[];
  default_dialect: Dialect;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  region_default: string | null;
  locale_default: Locale;
  owner_user_id: string | null;
  created_at: string;
  industry?: string | null;
  industry_hint?: string | null;
  primary_region?: string | null;
  brand_voice_json?: BusinessProfile | Record<string, unknown> | null;
  business_type?: string | null;
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

export type CompetitorSnapshot = {
  id: string;
  competitor_post_id: string | null;
  competitor_account_id: string;
  scope: "post" | "account";
  captured_at: string;
  followers_count: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  impressions: number | null;
  reach: number | null;
  video_views: number | null;
  engagement_rate: number | null;
  metadata: Record<string, unknown>;
};

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
  source: string;
  is_active: boolean;
  last_scraped_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  latest_snapshot?: CompetitorSnapshot | null;
};

export type CompetitorCandidate = {
  id: string;
  workspace_id: string;
  platform: Provider;
  handle: string;
  display_name: string | null;
  profile_url: string | null;
  avatar_url: string | null;
  region: string | null;
  industry: string | null;
  tags: string[];
  source: "manual" | "brave_search" | "web_search" | "meta_business_discovery" | "apify";
  status: "pending" | "approved" | "rejected";
  relevance_score: number;
  confidence: number;
  rationale: string | null;
  signals: string[];
  evidence_json: Array<{
    source?: string;
    query?: string;
    title?: string;
    snippet?: string;
    url?: string;
    published_at?: string | null;
  }>;
  raw_payload_json: Record<string, unknown>;
  approved_competitor_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CompetitorDiscoveryResponse = {
  generated_at: string;
  source: string;
  real_data_only: boolean;
  context: {
    brand_name: string;
    category: string;
    location: string;
    platform: Provider;
    keywords: string[];
    hashtags: string[];
    audience_size: string | number | null;
  };
  candidates: CompetitorCandidate[];
  warnings: string[];
};

export type CompetitorComparisonMetric = {
  label: string;
  post_count: number;
  total_engagement: number;
  total_reach: number;
  total_impressions: number;
  total_video_views: number;
  avg_engagement_rate: number | null;
  avg_engagement_per_post: number;
  avg_posts_per_week?: number;
  avg_caption_keywords?: number;
  format_mix: Record<string, number>;
  top_format?: string | null;
  top_format_share?: number;
  keyword_mix?: Record<string, number>;
  top_post: {
    caption: string | null;
    url: string | null;
    media_type: string | null;
    published_at: string | null;
    engagement_total: number;
    engagement_rate: number | null;
  } | null;
};

export type CompetitorComparisonRow = CompetitorComparisonMetric & {
  competitor_id: string;
  handle: string;
  display_name: string | null;
  platform: Provider;
  profile_url: string | null;
  latest_snapshot: CompetitorSnapshot | null;
  followers_count?: number | null;
  evidence_count?: number;
  evidence_sources?: Record<string, number>;
  last_scraped_at?: string | null;
};

export type CompetitorBenchmark = {
  window_days: number;
  engagement_winner: "you" | "competitors" | "insufficient_data";
  output_winner: "you" | "competitors" | "tied";
  engagement_rate_gap: number | null;
  output_gap_posts: number;
  format_gap: {
    own_top_format: string | null;
    competitor_top_format: string | null;
    message: string;
  };
  data_quality_score: number;
  data_quality_label: "strong" | "usable" | "thin";
  evidence_coverage: {
    approved_competitors: number;
    competitors_with_posts: number;
    competitors_with_snapshots: number;
    public_evidence_items: number;
  };
  best_benchmark: {
    handle: string;
    display_name: string | null;
    reason: string;
  } | null;
};

export type CompetitorOpportunity = {
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
};

export type CompetitorComparisonResponse = {
  generated_at: string;
  window_days: number;
  own: CompetitorComparisonMetric;
  competitors_summary: CompetitorComparisonMetric & {
    competitor_count: number;
    best_competitor_handle: string | null;
    followers_count?: number;
    avg_followers?: number | null;
    evidence_count?: number;
    accounts_with_posts?: number;
    accounts_with_snapshots?: number;
    top_format?: string | null;
    top_format_share?: number;
  };
  competitors: CompetitorComparisonRow[];
  deltas: {
    engagement_rate_delta: number | null;
    post_count_delta: number;
    engagement_total_delta: number;
  };
  benchmark?: CompetitorBenchmark;
  opportunities?: CompetitorOpportunity[];
  recommendations: string[];
  warnings: string[];
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

export type TrendScope = "micro" | "macro";

export type TrendEvidenceSample = {
  source: string;
  platform: string | null;
  title: string | null;
  caption: string | null;
  url: string | null;
  author: string | null;
  published_at: string | null;
  engagement_total: number;
  media_type: string | null;
};

export type TrendTopic = {
  topic_name: string;
  topic_keywords: string[];
  trend_score: number;
  scope: TrendScope;
  evidence_count: number;
  score_breakdown: Record<string, number>;
  format_counts: Record<string, number>;
  source_counts: Record<string, number>;
  caption_pattern_counts: Record<string, number>;
  average_engagement: number;
  top_evidence: TrendEvidenceSample[];
};

export type TrendInsight = {
  insight_text: string;
  confidence_score: number;
  supporting_evidence_count: number;
  topic_name: string;
  scope: TrendScope;
  evidence_count: number;
  format_pattern: string;
  caption_pattern: string;
  engagement_reason: string;
  supporting_sources: Record<string, number>;
};

export type TrendRecommendation = {
  recommendation_text: string;
  recommendation_type: string;
  priority_score: number;
  topic_name: string;
  scope: TrendScope;
};

export type TrendIntelligenceResponse = {
  workspace_id: string;
  brand_id: string | null;
  generated_at: string;
  elapsed_ms: number;
  context: {
    brand_id?: string | null;
    brand_name: string;
    category: string;
    industry: string;
    location: string | null;
    audience: string;
    keywords: string[];
    hashtags: string[];
  };
  runs: Array<{
    id: string;
    scope: TrendScope;
    status: "running" | "succeeded" | "failed";
    evidence_count: number;
    persistence_disabled?: boolean;
  }>;
  source_summary: Record<string, number>;
  local_trends: TrendTopic[];
  global_trends: TrendTopic[];
  format_trends: Array<{
    format: string;
    evidence_count: number;
    average_engagement: number;
    sources: Record<string, number>;
  }>;
  caption_trends: Array<{
    pattern: string;
    evidence_count: number;
    average_engagement: number;
    example: string | null;
  }>;
  campaign_theme_trends: Array<{
    theme: string;
    scope: TrendScope;
    trend_score: number;
    evidence_count: number;
    suggested_angle: string;
  }>;
  insights: TrendInsight[];
  recommendations: TrendRecommendation[];
  warnings: string[];
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
