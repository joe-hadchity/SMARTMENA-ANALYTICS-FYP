# API reference (beta)

Base URL: `http://localhost:4000/api`. Live Swagger UI:
`http://localhost:4000/api/docs`. Raw OpenAPI 3.0 spec:
`http://localhost:4000/api/docs.json`.

All responses are JSON. Validation errors return `400 { message, details }`.
Upstream ML errors return `502`. Supabase unavailability returns `503`.

## Conventions

- **camelCase** is the public convention. Where the underlying database column
  is snake_case, translation happens exactly once inside `services/mlClient.js`
  or `services/dbService.js`.
- **Workspaces are the tenant boundary.** Every request on a workspace-scoped
  endpoint resolves the workspace from an `x-workspace-id: <uuid>` header.
  When absent, the backend auto-creates (and then uses) a `demo` workspace so
  the API works out of the box with zero setup.
- **No authentication** in the beta. When auth lands the workspace FK becomes
  the tenant boundary and RLS is enabled on every table.

## Health

### `GET /api/health`

```bash
curl http://localhost:4000/api/health
```

## Workspaces

| Method | Path                    | Purpose                                                     |
| ------ | ----------------------- | ----------------------------------------------------------- |
| GET    | `/api/workspaces`       | List all workspaces.                                        |
| GET    | `/api/workspaces/current` | Resolve active workspace (via header or the `demo` fallback). |
| POST   | `/api/workspaces`       | Create a workspace.                                         |
| GET    | `/api/workspaces/:id`   | Get a single workspace.                                     |

```bash
curl -X POST http://localhost:4000/api/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Labs","slug":"acme","region_default":"AE","locale_default":"ar"}'
```

## Social accounts (connected sources)

Providers supported today: `meta_instagram`, `meta_facebook` (both in mock
mode — no real OAuth). Adapter interface is documented in
`backend/src/services/providers/types.js`. TikTok and X are drop-ins later.

| Method | Path                                      | Purpose                                       |
| ------ | ----------------------------------------- | --------------------------------------------- |
| GET    | `/api/social-accounts`                    | List accounts for the active workspace.       |
| POST   | `/api/social-accounts/connect/meta`       | Mock-connect an Instagram or Facebook account. |
| POST   | `/api/social-accounts/:id/sync`           | Pull fresh posts + metrics from the provider.  |
| GET    | `/api/social-accounts/:id`                | Get a single account.                          |
| DELETE | `/api/social-accounts/:id`                | Disconnect (removes synced posts + metrics).   |

```bash
# mock-connect Instagram (auto-generates a handle if not provided)
curl -X POST http://localhost:4000/api/social-accounts/connect/meta \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: <uuid>" \
  -d '{"kind":"instagram","handle":"acme_me"}'

# trigger a sync (fabricates ~24 bilingual posts + metrics via metaMockProvider)
curl -X POST http://localhost:4000/api/social-accounts/<id>/sync \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: <uuid>" \
  -d '{"limit":24,"daysBack":30}'
```

## Synced posts

| Method | Path                                  | Purpose                                          |
| ------ | ------------------------------------- | ------------------------------------------------ |
| GET    | `/api/synced-posts`                   | List synced posts. Query: `socialAccountId`, `lang`, `postType`, `limit`. |
| GET    | `/api/synced-posts/:id`               | Get one synced post.                             |
| GET    | `/api/synced-posts/:id/metrics`       | Time-series of metrics. Query: `from`, `to`, `limit`. |

## Analytics dashboard

All endpoints are workspace-scoped.

| Method | Path                                  | Purpose                                                           |
| ------ | ------------------------------------- | ----------------------------------------------------------------- |
| GET    | `/api/analytics/overview`             | KPIs (reach, impressions, engagements, sentiment avg, ROI avg).   |
| GET    | `/api/analytics/timeseries`           | `metric=engagement\|reach\|impressions`, `groupBy=day\|week`.     |
| GET    | `/api/analytics/platform-breakdown`   | Aggregates by provider.                                           |
| GET    | `/api/analytics/sentiment-breakdown`  | Positive / neutral / negative shares of analysed posts.           |
| GET    | `/api/analytics/top-posts`            | Top synced posts by `engagement` / `reach` / `impressions` / `engagement_rate`. |

## AI insights

Rule-based generators combine sentiment + ROI + metrics + MENA calendar into
bilingual insight rows stored in `ai_insights`.

Generated types:
`sentiment_summary`, `performance_anomaly`, `content_recommendation`,
`best_posting_time`, `mena_trend`.

| Method | Path                       | Purpose                                      |
| ------ | -------------------------- | -------------------------------------------- |
| GET    | `/api/insights`            | List (filters: `scopeType`, `insightType`, `severity`, `limit`). |
| POST   | `/api/insights/generate`   | Re-run all generators and persist new rows.  |

## MENA recommendations

Combines a static MENA calendar (Ramadan, Eid Al-Fitr, Eid Al-Adha,
UAE/KSA/LB/EG/JO national days, White Friday, Back-to-School) with
posting-window heuristics per region/platform, AR/EN language-mix guidance
and a reuse of `/predict-roi` for the predicted-ROI range.

| Method | Path                            | Purpose                        |
| ------ | ------------------------------- | ------------------------------ |
| POST   | `/api/recommendations/mena`     | Get a MENA-tailored playbook.  |

Body:

```json
{
  "platform": "instagram",
  "region": "AE",
  "contentType": "reel",
  "budget": 500,
  "audienceSize": 20000
}
```

## Campaigns (v1, workspace-aware)

`POST /api/campaigns` has always existed; list + detail were added in the
beta and auto-stamp the active `workspace_id` on new rows.

| Method | Path                    | Purpose                                                    |
| ------ | ----------------------- | ---------------------------------------------------------- |
| GET    | `/api/campaigns`        | List for active workspace.                                 |
| POST   | `/api/campaigns`        | Create a campaign.                                         |
| GET    | `/api/campaigns/:id`    | Detail with related posts, predictions, and latest prediction. |

## Posts (user-drafted copy, v1, workspace-aware)

| Method | Path             | Purpose                                  |
| ------ | ---------------- | ---------------------------------------- |
| POST   | `/api/posts`     | Create a draft post attached to a campaign. |

## Sentiment

### `POST /api/analyze/sentiment`

Proxies the FastAPI `/predict-sentiment` endpoint (CAMeL-Lab Arabic BERT),
persists the result in `sentiment_results`.

```bash
curl -X POST http://localhost:4000/api/analyze/sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "b2c3d4e5-6f7a-48b9-90c1-2d3e4f5a6b7c",
    "text": "المنتج ممتاز جداً وأنصح به بشدة"
  }'
```

## ROI

### `POST /api/predict/roi`

Proxies the FastAPI `/predict-roi` endpoint (GradientBoostingRegressor
trained on the synthetic MENA campaigns dataset), persists the result in
`predictions`.

```bash
curl -X POST http://localhost:4000/api/predict/roi \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "f3e9e4e0-5e6f-47a8-9b0c-1d2e3f4a5b6c",
    "budget": 800,
    "platform": "tiktok",
    "contentType": "reel",
    "audienceSize": 20000,
    "postingHour": 19,
    "sentimentScore": 0.85,
    "holidayFlag": 1,
    "region": "UAE"
  }'
```

Allowed enums:
- `platform`: `instagram | facebook | tiktok | twitter`
- `contentType`: `image | video | carousel | reel | story`
- `region`: `Lebanon | UAE | Saudi Arabia | Egypt | Jordan`
