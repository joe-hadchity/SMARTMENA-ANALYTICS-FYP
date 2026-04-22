/**
 * OpenAPI 3.0 specification for the SmartMENA Analytics backend.
 *
 * Kept as a single plain JS object so the whole contract sits in one file
 * that is easy to review. Reusable pieces live under `components`; endpoint
 * examples are inlined for readability.
 *
 * Swagger UI is mounted in app.js at GET /api/docs and the raw JSON spec
 * is exposed at GET /api/docs.json.
 *
 * Sections:
 *   - Health
 *   - Workspaces (tenant boundary for the beta)
 *   - Social accounts (pluggable provider adapters; Meta mock today)
 *   - Synced posts / metrics
 *   - Campaigns (v1, now workspace-aware)
 *   - Posts (v1, workspace-aware)
 *   - Analytics dashboard
 *   - AI insights
 *   - MENA recommendations
 *   - Sentiment (Arabic; proxied to ML service)
 *   - ROI prediction (proxied to ML service)
 */

const env = require("./env");

const workspaceHeaderParam = {
  name: "x-workspace-id",
  in: "header",
  required: false,
  schema: { type: "string", format: "uuid" },
  description:
    "Active workspace UUID. If omitted, the backend falls back to a " +
    "`demo` workspace (auto-created on first use).",
};

const spec = {
  openapi: "3.0.3",
  info: {
    title: "SmartMENA Analytics API",
    version: "0.2.0-beta",
    description:
      "Backend API for SmartMENA Analytics -- an AI-powered social media " +
      "intelligence platform for MENA startups and SMEs. The Express " +
      "backend persists workspaces, social accounts, synced posts, " +
      "campaigns, and AI insights in Supabase, and proxies ML requests " +
      "to the FastAPI service for Arabic sentiment and ROI prediction.\n\n" +
      "**Tenant boundary**: workspaces. Requests resolve the active " +
      "workspace from `x-workspace-id`, falling back to a `demo` " +
      "workspace when the header is absent.\n\n" +
      "**Providers**: social platforms are loaded through a pluggable " +
      "adapter interface (`backend/src/services/providers/types.js`). " +
      "Meta (Instagram + Facebook) ships in mock mode in the beta; " +
      "TikTok and X are designed as drop-in providers for later phases.",
  },
  servers: [
    {
      url: `http://localhost:${env.PORT || 4000}`,
      description: "Local development",
    },
  ],
  tags: [
    { name: "Health", description: "Service liveness" },
    { name: "Workspaces", description: "Tenant boundary for the beta" },
    {
      name: "Social accounts",
      description: "Connect and sync external social platforms (mock Meta in the beta)",
    },
    { name: "Synced posts", description: "Posts ingested from providers + metrics" },
    { name: "Campaigns", description: "Campaign management (workspace-scoped)" },
    { name: "Posts", description: "Draft posts attached to campaigns" },
    { name: "Analytics", description: "Aggregated dashboard data" },
    { name: "Insights", description: "AI-generated bilingual insights" },
    { name: "Recommendations", description: "MENA-tailored playbooks" },
    { name: "Analyze", description: "Arabic sentiment analysis (proxied to ML service)" },
    { name: "Predict", description: "ROI prediction (proxied to ML service)" },
  ],

  // --------------------------------------------------------------------------
  // Paths
  // --------------------------------------------------------------------------
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        description: "Returns service metadata. Use for uptime checks.",
        responses: {
          200: {
            description: "Service is up.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
                example: {
                  status: "ok",
                  service: "smartmena-backend",
                  uptime: 42.137,
                  timestamp: "2026-04-20T10:30:00.000Z",
                },
              },
            },
          },
        },
      },
    },

    // ----------------------------------------------------------------------
    // Workspaces
    // ----------------------------------------------------------------------
    "/api/workspaces": {
      get: {
        tags: ["Workspaces"],
        summary: "List all workspaces",
        responses: {
          200: {
            description: "Array of workspaces.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Workspace" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Workspaces"],
        summary: "Create a workspace",
        description:
          "Creates a workspace. `slug` is auto-derived from `name` when " +
          "omitted and uniquified if needed.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWorkspaceRequest" },
              example: {
                name: "Acme Labs",
                slug: "acme",
                region_default: "AE",
                locale_default: "ar",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Workspace created.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Workspace" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          503: { $ref: "#/components/responses/DbUnavailable" },
        },
      },
    },
    "/api/workspaces/current": {
      get: {
        tags: ["Workspaces"],
        summary: "Resolve the active workspace",
        description:
          "Resolves the active workspace from the `x-workspace-id` header " +
          "or falls back to the `demo` workspace (auto-created).",
        parameters: [workspaceHeaderParam],
        responses: {
          200: {
            description: "Active workspace.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Workspace" },
              },
            },
          },
        },
      },
    },
    "/api/workspaces/{id}": {
      get: {
        tags: ["Workspaces"],
        summary: "Get a single workspace",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Workspace.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Workspace" },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ----------------------------------------------------------------------
    // Social accounts
    // ----------------------------------------------------------------------
    "/api/social-accounts": {
      get: {
        tags: ["Social accounts"],
        summary: "List connected social accounts for the active workspace",
        parameters: [workspaceHeaderParam],
        responses: {
          200: {
            description: "Array of social accounts.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/SocialAccount" },
                },
              },
            },
          },
        },
      },
    },
    "/api/social-accounts/connect/meta": {
      post: {
        tags: ["Social accounts"],
        summary: "Mock-connect a Meta (Instagram or Facebook) account",
        description:
          "Uses `metaMockProvider` to fabricate a deterministic account. " +
          "The provider interface is identical to the future real provider, " +
          "so swapping this out for real OAuth is a drop-in change.",
        parameters: [workspaceHeaderParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConnectMetaRequest" },
              example: { kind: "instagram", handle: "acme_me" },
            },
          },
        },
        responses: {
          201: {
            description: "Social account connected.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SocialAccount" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/social-accounts/{id}": {
      get: {
        tags: ["Social accounts"],
        summary: "Get a single connected account",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Social account.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SocialAccount" },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Social accounts"],
        summary: "Disconnect a social account",
        description: "Cascades to synced posts and metrics.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          204: { description: "Deleted." },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/social-accounts/{id}/sync": {
      post: {
        tags: ["Social accounts"],
        summary: "Trigger a sync for a connected account",
        description:
          "Asks the registered provider for the latest posts + metrics, " +
          "upserts them into `synced_posts`, and appends a fresh row to " +
          "`post_metrics` for each post. Runs inline (no background " +
          "worker in the beta).",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SyncRequest" },
              example: { limit: 24, daysBack: 30 },
            },
          },
        },
        responses: {
          200: {
            description: "Sync summary.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SyncResult" },
                example: {
                  socialAccountId: "b2c3d4e5-6f7a-48b9-90c1-2d3e4f5a6b7c",
                  provider: "meta_instagram",
                  postsUpserted: 24,
                  metricsInserted: 24,
                  lastSyncedAt: "2026-04-20T10:30:00.000Z",
                },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ----------------------------------------------------------------------
    // Synced posts
    // ----------------------------------------------------------------------
    "/api/synced-posts": {
      get: {
        tags: ["Synced posts"],
        summary: "List synced posts for the active workspace",
        parameters: [
          workspaceHeaderParam,
          { name: "socialAccountId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "lang", in: "query", schema: { type: "string", enum: ["ar", "en", "mixed"] } },
          {
            name: "postType",
            in: "query",
            schema: {
              type: "string",
              enum: ["image", "video", "carousel", "reel", "story", "text"],
            },
          },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200 } },
        ],
        responses: {
          200: {
            description: "Array of synced posts.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/SyncedPost" },
                },
              },
            },
          },
        },
      },
    },
    "/api/synced-posts/{id}": {
      get: {
        tags: ["Synced posts"],
        summary: "Get a single synced post",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Synced post.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SyncedPost" },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/synced-posts/{id}/metrics": {
      get: {
        tags: ["Synced posts"],
        summary: "Time-series of metrics for a synced post",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500 } },
        ],
        responses: {
          200: {
            description: "Array of metric snapshots, oldest first.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PostMetrics" },
                },
              },
            },
          },
        },
      },
    },

    // ----------------------------------------------------------------------
    // Campaigns
    // ----------------------------------------------------------------------
    "/api/campaigns": {
      get: {
        tags: ["Campaigns"],
        summary: "List campaigns for the active workspace",
        parameters: [workspaceHeaderParam],
        responses: {
          200: {
            description: "Array of campaigns.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Campaign" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Campaigns"],
        summary: "Create a campaign",
        description:
          "Creates a campaign row in Supabase and stamps the active " +
          "`workspace_id` from the request context. `user_id` must " +
          "reference an existing user. `platform` is one of: facebook, " +
          "instagram, tiktok, google, x.",
        parameters: [workspaceHeaderParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCampaignRequest" },
              example: {
                user_id: "a1b2c3d4-5e6f-47a8-9b0c-1d2e3f4a5b6c",
                campaign_name: "Ramadan Sale 2026",
                platform: "instagram",
                budget: 750.0,
                audience_size: 25000,
                content_type: "reel",
                posting_time: "2026-03-15T19:00:00.000Z",
                region: "AE",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Campaign created.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Campaign" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          503: { $ref: "#/components/responses/DbUnavailable" },
        },
      },
    },
    "/api/campaigns/{id}": {
      get: {
        tags: ["Campaigns"],
        summary: "Get a campaign with related posts, predictions and latest prediction",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Campaign detail.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CampaignDetail" },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ----------------------------------------------------------------------
    // Posts (drafts attached to a campaign)
    // ----------------------------------------------------------------------
    "/api/posts": {
      post: {
        tags: ["Posts"],
        summary: "Create a post linked to a campaign",
        description:
          "Creates a post in Supabase and stamps the active `workspace_id`. " +
          "`campaign_id` must reference an existing campaign; the foreign " +
          "key is enforced at the DB level.",
        parameters: [workspaceHeaderParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePostRequest" },
              example: {
                campaign_id: "f3e9e4e0-5e6f-47a8-9b0c-1d2e3f4a5b6c",
                text_content: "المنتج ممتاز جداً وأنصح به بشدة",
                language: "ar",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Post created.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Post" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          503: { $ref: "#/components/responses/DbUnavailable" },
        },
      },
    },

    // ----------------------------------------------------------------------
    // Analytics
    // ----------------------------------------------------------------------
    "/api/analytics/overview": {
      get: {
        tags: ["Analytics"],
        summary: "KPI overview for the active workspace",
        parameters: [workspaceHeaderParam],
        responses: {
          200: {
            description: "KPIs.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyticsOverview" },
              },
            },
          },
        },
      },
    },
    "/api/analytics/timeseries": {
      get: {
        tags: ["Analytics"],
        summary: "Time-series for the active workspace",
        parameters: [
          workspaceHeaderParam,
          {
            name: "metric",
            in: "query",
            schema: { type: "string", enum: ["engagement", "reach", "impressions"] },
          },
          { name: "groupBy", in: "query", schema: { type: "string", enum: ["day", "week"] } },
        ],
        responses: {
          200: {
            description: "Time-series points.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      bucket: { type: "string" },
                      value: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/analytics/platform-breakdown": {
      get: {
        tags: ["Analytics"],
        summary: "Aggregate metrics per platform",
        parameters: [workspaceHeaderParam],
        responses: {
          200: {
            description: "Breakdown per platform.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PlatformBreakdownRow" },
                },
              },
            },
          },
        },
      },
    },
    "/api/analytics/sentiment-breakdown": {
      get: {
        tags: ["Analytics"],
        summary: "Sentiment distribution of analysed posts",
        parameters: [workspaceHeaderParam],
        responses: {
          200: {
            description: "Positive / neutral / negative shares.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SentimentBreakdown" },
              },
            },
          },
        },
      },
    },
    "/api/analytics/top-posts": {
      get: {
        tags: ["Analytics"],
        summary: "Top synced posts for the active workspace",
        parameters: [
          workspaceHeaderParam,
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50 } },
          {
            name: "sortBy",
            in: "query",
            schema: {
              type: "string",
              enum: ["engagement", "reach", "impressions", "engagement_rate"],
            },
          },
        ],
        responses: {
          200: {
            description: "Top posts.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/SyncedPost" },
                },
              },
            },
          },
        },
      },
    },

    // ----------------------------------------------------------------------
    // Insights
    // ----------------------------------------------------------------------
    "/api/insights": {
      get: {
        tags: ["Insights"],
        summary: "List AI insights for the active workspace",
        parameters: [
          workspaceHeaderParam,
          {
            name: "scopeType",
            in: "query",
            schema: {
              type: "string",
              enum: ["workspace", "campaign", "social_account", "synced_post"],
            },
          },
          {
            name: "insightType",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "sentiment_summary",
                "performance_anomaly",
                "content_recommendation",
                "best_posting_time",
                "mena_trend",
              ],
            },
          },
          {
            name: "severity",
            in: "query",
            schema: { type: "string", enum: ["info", "warning", "opportunity"] },
          },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200 } },
        ],
        responses: {
          200: {
            description: "Array of insights, newest first.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/AiInsight" },
                },
              },
            },
          },
        },
      },
    },
    "/api/insights/generate": {
      post: {
        tags: ["Insights"],
        summary: "Re-run all insight generators and persist new rows",
        parameters: [workspaceHeaderParam],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerateInsightsRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Newly generated insights.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/AiInsight" },
                },
              },
            },
          },
        },
      },
    },

    // ----------------------------------------------------------------------
    // Recommendations
    // ----------------------------------------------------------------------
    "/api/recommendations/mena": {
      post: {
        tags: ["Recommendations"],
        summary: "MENA-tailored playbook for a candidate post",
        description:
          "Combines a static MENA calendar (Ramadan, Eid Al-Fitr, Eid " +
          "Al-Adha, national days, White Friday, Back-to-School) with " +
          "posting-window heuristics and a reuse of `/predict-roi` for " +
          "the predicted-ROI range. Returns a bilingual summary.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MenaRecommendationRequest" },
              example: {
                platform: "instagram",
                region: "AE",
                contentType: "reel",
                budget: 500,
                audienceSize: 20000,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Recommendation.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MenaRecommendationResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },

    // ----------------------------------------------------------------------
    // Sentiment
    // ----------------------------------------------------------------------
    "/api/analyze/sentiment": {
      post: {
        tags: ["Analyze"],
        summary: "Classify Arabic post text",
        description:
          "Calls the FastAPI `/predict-sentiment` endpoint using a pretrained " +
          "CAMeL-Lab Arabic BERT model, persists the result in " +
          "`sentiment_results`, and returns the label + confidence.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AnalyzeSentimentRequest" },
              example: {
                postId: "b2c3d4e5-6f7a-48b9-90c1-2d3e4f5a6b7c",
                text: "المنتج ممتاز جداً وأنصح به بشدة",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Sentiment analysed and stored.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyzeSentimentResponse" },
                example: {
                  postId: "b2c3d4e5-6f7a-48b9-90c1-2d3e4f5a6b7c",
                  sentiment: "positive",
                  confidence: 0.9812,
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          502: { $ref: "#/components/responses/MlBadResponse" },
          503: { $ref: "#/components/responses/MlOrDbUnavailable" },
          504: { $ref: "#/components/responses/MlTimeout" },
        },
      },
    },

    // ----------------------------------------------------------------------
    // ROI
    // ----------------------------------------------------------------------
    "/api/predict/roi": {
      post: {
        tags: ["Predict"],
        summary: "Predict campaign ROI and engagement",
        description:
          "Calls the FastAPI `/predict-roi` endpoint (GradientBoosting " +
          "regressor trained on the synthetic MENA campaigns dataset), " +
          "persists the result in `predictions`, and returns predicted " +
          "ROI, engagement rate, and a confidence score.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PredictRoiRequest" },
              example: {
                campaignId: "f3e9e4e0-5e6f-47a8-9b0c-1d2e3f4a5b6c",
                budget: 800,
                platform: "tiktok",
                contentType: "reel",
                audienceSize: 20000,
                postingHour: 19,
                sentimentScore: 0.85,
                holidayFlag: 1,
                region: "UAE",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Prediction computed and stored.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PredictRoiResponse" },
                example: {
                  campaignId: "f3e9e4e0-5e6f-47a8-9b0c-1d2e3f4a5b6c",
                  predictedRoi: 10.4479,
                  predictedEngagement: 0.1347,
                  confidenceScore: 0.7346,
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          502: { $ref: "#/components/responses/MlBadResponse" },
          503: { $ref: "#/components/responses/MlOrDbUnavailable" },
          504: { $ref: "#/components/responses/MlTimeout" },
        },
      },
    },
  },

  // --------------------------------------------------------------------------
  // Components: reusable schemas and responses
  // --------------------------------------------------------------------------
  components: {
    schemas: {
      // --- Health -----------------------------------------------------------
      HealthResponse: {
        type: "object",
        required: ["status", "service", "uptime", "timestamp"],
        properties: {
          status: { type: "string", example: "ok" },
          service: { type: "string", example: "smartmena-backend" },
          uptime: { type: "number", format: "float", description: "Process uptime in seconds." },
          timestamp: { type: "string", format: "date-time" },
        },
      },

      // --- Workspaces -------------------------------------------------------
      Workspace: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          slug: { type: "string" },
          region_default: { type: "string", nullable: true, example: "AE" },
          locale_default: { type: "string", enum: ["ar", "en"], example: "ar" },
          owner_user_id: { type: "string", format: "uuid", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      CreateWorkspaceRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          slug: {
            type: "string",
            nullable: true,
            pattern: "^[a-z0-9-]+$",
            description: "Auto-derived from name when omitted.",
          },
          region_default: {
            type: "string",
            enum: ["LB", "AE", "SA", "EG", "JO"],
            nullable: true,
          },
          locale_default: { type: "string", enum: ["ar", "en"], nullable: true },
          owner_user_id: { type: "string", format: "uuid", nullable: true },
        },
      },

      // --- Social accounts --------------------------------------------------
      SocialAccount: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          workspace_id: { type: "string", format: "uuid" },
          provider: {
            type: "string",
            enum: ["meta_instagram", "meta_facebook", "tiktok", "x"],
          },
          external_account_id: { type: "string" },
          handle: { type: "string", nullable: true },
          display_name: { type: "string", nullable: true },
          avatar_url: { type: "string", nullable: true },
          profile_url: { type: "string", nullable: true },
          is_mock: { type: "boolean" },
          last_synced_at: { type: "string", format: "date-time", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      ConnectMetaRequest: {
        type: "object",
        required: ["kind"],
        properties: {
          kind: { type: "string", enum: ["instagram", "facebook"] },
          handle: {
            type: "string",
            nullable: true,
            pattern: "^[a-zA-Z0-9_.-]+$",
            description: "Auto-generated when omitted.",
          },
          displayName: { type: "string", nullable: true },
        },
      },
      SyncRequest: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 100, default: 24 },
          daysBack: { type: "integer", minimum: 1, maximum: 365, default: 30 },
        },
      },
      SyncResult: {
        type: "object",
        properties: {
          socialAccountId: { type: "string", format: "uuid" },
          provider: { type: "string" },
          postsUpserted: { type: "integer" },
          metricsInserted: { type: "integer" },
          lastSyncedAt: { type: "string", format: "date-time" },
        },
      },

      // --- Synced posts -----------------------------------------------------
      SyncedPost: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          workspace_id: { type: "string", format: "uuid" },
          social_account_id: { type: "string", format: "uuid" },
          external_post_id: { type: "string" },
          post_type: {
            type: "string",
            enum: ["image", "video", "carousel", "reel", "story", "text"],
          },
          caption: { type: "string", nullable: true },
          caption_lang: { type: "string", enum: ["ar", "en", "mixed"], nullable: true },
          media_url: { type: "string", nullable: true },
          permalink: { type: "string", nullable: true },
          posted_at: { type: "string", format: "date-time", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      PostMetrics: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          synced_post_id: { type: "string", format: "uuid" },
          captured_at: { type: "string", format: "date-time" },
          likes: { type: "integer", nullable: true },
          comments: { type: "integer", nullable: true },
          shares: { type: "integer", nullable: true },
          saves: { type: "integer", nullable: true },
          impressions: { type: "integer", nullable: true },
          reach: { type: "integer", nullable: true },
          video_views: { type: "integer", nullable: true },
          engagement_rate: { type: "number", nullable: true, minimum: 0, maximum: 1 },
        },
      },

      // --- Campaigns --------------------------------------------------------
      CreateCampaignRequest: {
        type: "object",
        required: ["user_id", "campaign_name", "platform", "budget"],
        properties: {
          user_id: { type: "string", format: "uuid" },
          campaign_name: { type: "string", minLength: 1, maxLength: 200 },
          platform: {
            type: "string",
            enum: ["facebook", "instagram", "tiktok", "google", "x"],
          },
          budget: { type: "number", minimum: 0 },
          audience_size: { type: "integer", minimum: 0, nullable: true },
          content_type: { type: "string", maxLength: 50, nullable: true },
          posting_time: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "ISO 8601 datetime.",
          },
          region: { type: "string", maxLength: 10, nullable: true, example: "AE" },
        },
      },
      Campaign: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          user_id: { type: "string", format: "uuid" },
          workspace_id: { type: "string", format: "uuid", nullable: true },
          campaign_name: { type: "string" },
          platform: { type: "string" },
          budget: { type: "number" },
          audience_size: { type: "integer", nullable: true },
          content_type: { type: "string", nullable: true },
          posting_time: { type: "string", format: "date-time", nullable: true },
          region: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      CampaignDetail: {
        allOf: [
          { $ref: "#/components/schemas/Campaign" },
          {
            type: "object",
            properties: {
              posts: {
                type: "array",
                items: { $ref: "#/components/schemas/Post" },
              },
              predictions: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              latest_prediction: {
                type: "object",
                additionalProperties: true,
                nullable: true,
              },
            },
          },
        ],
      },

      // --- Posts ------------------------------------------------------------
      CreatePostRequest: {
        type: "object",
        required: ["campaign_id", "text_content"],
        properties: {
          campaign_id: { type: "string", format: "uuid" },
          text_content: { type: "string", minLength: 1, maxLength: 5000 },
          language: {
            type: "string",
            minLength: 2,
            maxLength: 10,
            default: "ar",
            example: "ar",
          },
        },
      },
      Post: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          campaign_id: { type: "string", format: "uuid" },
          workspace_id: { type: "string", format: "uuid", nullable: true },
          text_content: { type: "string" },
          language: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },

      // --- Analytics --------------------------------------------------------
      AnalyticsOverview: {
        type: "object",
        properties: {
          totalPosts: { type: "integer" },
          totalReach: { type: "integer" },
          totalImpressions: { type: "integer" },
          totalEngagements: { type: "integer" },
          avgEngagementRate: { type: "number", minimum: 0, maximum: 1 },
          avgSentiment: { type: "number", nullable: true },
          avgPredictedRoi: { type: "number", nullable: true },
          connectedAccounts: { type: "integer" },
        },
      },
      PlatformBreakdownRow: {
        type: "object",
        properties: {
          provider: { type: "string" },
          posts: { type: "integer" },
          reach: { type: "integer" },
          impressions: { type: "integer" },
          engagements: { type: "integer" },
        },
      },
      SentimentBreakdown: {
        type: "object",
        properties: {
          positive: { type: "integer" },
          neutral: { type: "integer" },
          negative: { type: "integer" },
          total: { type: "integer" },
        },
      },

      // --- Insights ---------------------------------------------------------
      AiInsight: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          workspace_id: { type: "string", format: "uuid" },
          scope_type: {
            type: "string",
            enum: ["workspace", "campaign", "social_account", "synced_post"],
          },
          scope_id: { type: "string", format: "uuid", nullable: true },
          insight_type: {
            type: "string",
            enum: [
              "sentiment_summary",
              "performance_anomaly",
              "content_recommendation",
              "best_posting_time",
              "mena_trend",
            ],
          },
          severity: { type: "string", enum: ["info", "warning", "opportunity"] },
          title_en: { type: "string" },
          title_ar: { type: "string" },
          body_en: { type: "string" },
          body_ar: { type: "string" },
          payload: { type: "object", additionalProperties: true, nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      GenerateInsightsRequest: {
        type: "object",
        properties: {
          scopeType: {
            type: "string",
            enum: ["workspace", "campaign", "social_account", "synced_post"],
            nullable: true,
          },
          scopeId: { type: "string", format: "uuid", nullable: true },
        },
      },

      // --- MENA recommendations --------------------------------------------
      MenaRecommendationRequest: {
        type: "object",
        required: ["platform", "region"],
        properties: {
          platform: {
            type: "string",
            enum: [
              "instagram",
              "facebook",
              "tiktok",
              "x",
              "twitter",
              "meta_instagram",
              "meta_facebook",
            ],
          },
          region: { type: "string", enum: ["LB", "AE", "SA", "EG", "JO"] },
          contentType: {
            type: "string",
            enum: ["image", "video", "carousel", "reel", "story"],
            nullable: true,
          },
          budget: { type: "number", exclusiveMinimum: 0, nullable: true },
          audienceSize: { type: "integer", exclusiveMinimum: 0, nullable: true },
        },
      },
      MenaRecommendationResponse: {
        type: "object",
        properties: {
          region: { type: "string" },
          platform: { type: "string" },
          bestPostingWindows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dayOfWeek: { type: "string" },
                hourStart: { type: "integer", minimum: 0, maximum: 23 },
                hourEnd: { type: "integer", minimum: 0, maximum: 23 },
                reasonEn: { type: "string" },
                reasonAr: { type: "string" },
              },
            },
          },
          languageMix: {
            type: "object",
            properties: {
              arabicSharePct: { type: "integer", minimum: 0, maximum: 100 },
              englishSharePct: { type: "integer", minimum: 0, maximum: 100 },
              noteEn: { type: "string" },
              noteAr: { type: "string" },
            },
          },
          nearestEvent: {
            type: "object",
            nullable: true,
            properties: {
              key: { type: "string" },
              nameEn: { type: "string" },
              nameAr: { type: "string" },
              startsOn: { type: "string", format: "date" },
              endsOn: { type: "string", format: "date" },
              daysAway: { type: "integer" },
              tipEn: { type: "string" },
              tipAr: { type: "string" },
            },
          },
          predictedRoi: {
            type: "object",
            nullable: true,
            properties: {
              low: { type: "number" },
              expected: { type: "number" },
              high: { type: "number" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
          },
          summaryEn: { type: "string" },
          summaryAr: { type: "string" },
        },
      },

      // --- Sentiment --------------------------------------------------------
      AnalyzeSentimentRequest: {
        type: "object",
        required: ["postId", "text"],
        properties: {
          postId: { type: "string", format: "uuid" },
          text: { type: "string", minLength: 1, maxLength: 5000 },
        },
      },
      AnalyzeSentimentResponse: {
        type: "object",
        properties: {
          postId: { type: "string", format: "uuid" },
          sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },

      // --- ROI --------------------------------------------------------------
      PredictRoiRequest: {
        type: "object",
        required: [
          "campaignId",
          "budget",
          "platform",
          "contentType",
          "audienceSize",
          "postingHour",
          "sentimentScore",
          "holidayFlag",
          "region",
        ],
        properties: {
          campaignId: { type: "string", format: "uuid" },
          budget: { type: "number", exclusiveMinimum: 0 },
          platform: {
            type: "string",
            enum: ["instagram", "facebook", "tiktok", "twitter"],
          },
          contentType: {
            type: "string",
            enum: ["image", "video", "carousel", "reel", "story"],
          },
          audienceSize: { type: "integer", exclusiveMinimum: 0 },
          postingHour: { type: "integer", minimum: 0, maximum: 23 },
          sentimentScore: { type: "number", minimum: -1, maximum: 1 },
          holidayFlag: { type: "integer", minimum: 0, maximum: 1 },
          region: {
            type: "string",
            enum: ["Lebanon", "UAE", "Saudi Arabia", "Egypt", "Jordan"],
          },
        },
      },
      PredictRoiResponse: {
        type: "object",
        properties: {
          campaignId: { type: "string", format: "uuid" },
          predictedRoi: { type: "number", description: "Revenue / spend ratio." },
          predictedEngagement: { type: "number", minimum: 0, maximum: 1 },
          confidenceScore: { type: "number", minimum: 0, maximum: 1 },
        },
      },

      // --- Errors -----------------------------------------------------------
      Error: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string" },
          details: { type: "object", additionalProperties: true, nullable: true },
        },
      },
    },

    responses: {
      ValidationError: {
        description: "Request body failed validation.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              message: "Validation failed",
              details: {
                formErrors: [],
                fieldErrors: {
                  postId: ["postId must be a valid UUID"],
                  text: ["text is required"],
                },
              },
            },
          },
        },
      },
      NotFound: {
        description: "Resource not found.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { message: "Not found" },
          },
        },
      },
      MlBadResponse: {
        description: "ML service responded but with an unexpected payload shape.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              message: "ML service returned an invalid payload",
              details: { received: { foo: "bar" } },
            },
          },
        },
      },
      MlOrDbUnavailable: {
        description:
          "Either the ML service is unreachable / not ready, or Supabase is " +
          "not configured on the backend.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              message: "ML service unreachable",
              details: { endpoint: "/predict-roi", code: "ECONNREFUSED" },
            },
          },
        },
      },
      MlTimeout: {
        description: "The ML service did not respond within the configured timeout.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              message: "ML service timed out",
              details: { endpoint: "/predict-roi", timeoutMs: 60000 },
            },
          },
        },
      },
      DbUnavailable: {
        description: "Supabase is not configured on the backend.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              message:
                "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
            },
          },
        },
      },
    },
  },
};

module.exports = spec;
