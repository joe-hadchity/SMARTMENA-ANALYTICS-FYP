# SmartMENA Analytics

An AI-powered marketing analytics platform for small and medium-sized
enterprises (SMEs) operating in the Middle East and North Africa (MENA)
region. The MVP provides Arabic sentiment analysis on marketing posts and a
simple regression-based return-on-investment (ROI) predictor for social media
campaigns.

This repository is the backend + ML component of an FYP (final-year project).
The front-end and authentication layers are intentionally out of scope.

---

## 1. Project overview

MENA SMEs typically lack the analytics budgets of large enterprises and
face an Arabic-language gap in off-the-shelf social media tooling. The
product explores four small, well-scoped ideas:

1. **Arabic sentiment classification** of user-generated marketing content
   using a pretrained transformer so that campaign managers can track how
   audiences react in Arabic (MSA and dialect).
2. **Explainable ROI prediction** for candidate campaigns from structured
   metadata (budget, platform, audience, posting hour, sentiment,
   holiday flag, region), trained on a documented synthetic dataset.
3. **A workspace-first social intelligence product**: connect Meta
   accounts (Instagram + Facebook in the beta, TikTok + X later), sync
   posts + metrics, and watch aggregates populate a dashboard.
4. **MENA-tailored recommendations and bilingual AI insights** combining
   the ML models with a static MENA calendar (Ramadan, the two Eids,
   national days, White Friday, Back-to-School) and simple anomaly /
   language-mix rules.

The system is split into three loosely-coupled pieces that communicate
over HTTP. State lives in a single Supabase-hosted PostgreSQL database.

---

## 2. Beta scope

**In scope**

- REST API: health, workspaces, connected social accounts, synced posts
  and metrics, campaigns and drafts, analytics dashboard, AI insights,
  MENA recommendations, sentiment analysis, ROI prediction. Full list
  in `docs/api.md` and live Swagger UI at `/api/docs`.
- Workspace-scoped multi-tenancy via an `x-workspace-id` header, with a
  `demo` workspace auto-created on first use so the API works without
  setup.
- Pluggable social-platform providers: Meta Instagram + Facebook ship
  as a **mock** provider in the beta; TikTok and X are drop-in slots
  using the same contract.
- Arabic sentiment classification using a pretrained Hugging Face model
  (CAMeL-Lab CAMeLBERT), no fine-tuning.
- ROI + engagement-rate regression trained on a deterministically
  generated synthetic MENA campaign dataset.
- Rule-based, bilingual (AR/EN) AI insights (sentiment summary,
  performance anomaly, content recommendation, best posting time,
  MENA trend) persisted in `ai_insights`.
- Supabase (PostgreSQL + managed backups) as the single source of truth.
  Additive schema in `backend/db/schema_v2.sql`.
- Next.js 14 SaaS frontend in `frontend/` (AR RTL + EN LTR, TanStack
  Query, Recharts, Tailwind). Dashboard, connections, posts, campaigns,
  insights, recommendations, settings.
- Machine-readable API contract via OpenAPI 3.0 / Swagger UI.

**Out of scope** (deliberately deferred)

- Authentication, authorisation, Supabase RLS policies. The workspace
  FK is where RLS will hang when auth lands.
- Real Meta / TikTok / X OAuth. The provider interface exists; real
  adapters are a later phase.
- Containerisation, CI/CD, cloud deployment.
- Fine-tuning the Arabic sentiment model on MENA marketing data.
- Real campaign data: all ROI training data is synthetic. Meta posts
  and metrics in the beta are fabricated deterministically by
  `metaMockProvider`.

---

## 3. Architecture summary

Three pieces, one database. The Express backend is the public surface;
the FastAPI service is internal and only reachable from the backend;
the Next.js frontend is a pure consumer of the backend's HTTP API.

```
+------------------+      HTTP      +--------------------------+
|  Next.js SaaS    +--------------->+  Express backend         |
|  frontend (3000) |                |  (Node.js, MVC, port 4000)|
+------------------+                |                          |
                                    |  Controllers ->          |
                                    |  Services ->             |
                                    |   - mlClient (axios) ----+--> FastAPI ML service
                                    |   - providers/* --------+|    (Python, port 8000)
                                    |   - workspaceService     |    - /predict-sentiment
                                    |   - socialAccountService |    - /predict-roi
                                    |   - syncService          |    - /health
                                    |   - syncedPostService    |
                                    |   - analyticsService     |
                                    |   - insightsService      |
                                    |   - recommendationsService
                                    |   - dbService (supabase) |
                                    +------------+-------------+
                                                 |
                                                 v
                                    +--------------------------+
                                    |  Supabase PostgreSQL     |
                                    |  v1: users, campaigns,   |
                                    |      posts, sentiment_   |
                                    |      results, predictions|
                                    |  v2: workspaces,         |
                                    |      social_accounts,    |
                                    |      synced_posts,       |
                                    |      post_metrics,       |
                                    |      ai_insights         |
                                    +--------------------------+
```

Key properties:

- The backend never talks to disk models and the ML service never talks to
  Supabase. Each concern has one owner.
- camelCase is the public API convention; snake_case lives inside the ML
  service and the DB. Translation happens exactly once, in
  `backend/src/services/mlClient.js` (or at the edge of each service
  that calls Supabase directly).
- Workspaces are the tenant boundary. Every workspace-scoped endpoint
  resolves `req.workspaceId` via the `workspaceContext` middleware,
  which reads `x-workspace-id` or falls back to an auto-created `demo`
  workspace.
- Social platforms are loaded through a **provider registry**. Only the
  provider knows how to talk to Meta / TikTok / X; the rest of the
  backend sees a normalised shape (see section 16).

---

## 4. Repository layout

```
smartmena-analytics/
├── backend/          # Express API (port 4000)
├── ml-service/       # FastAPI ML service (port 8000)
├── frontend/         # Next.js 14 SaaS frontend (port 3000)
├── data/             # (optional shared data, currently unused)
├── docs/             # API reference + supplementary design notes
├── .gitignore
└── README.md         # this file
```

---

## 5. Backend structure

The backend follows a conventional MVC layout. Each layer has a single
responsibility; the controller is intentionally kept as thin as possible.

```
backend/
├── db/
│   ├── schema.sql                # PostgreSQL v1 schema (users, campaigns, …)
│   └── schema_v2.sql             # Beta additions (workspaces, social_accounts, …)
├── src/
│   ├── app.js                    # Express app + middleware + Swagger mount
│   ├── server.js                 # HTTP bootstrap (reads PORT, starts listen)
│   ├── config/
│   │   ├── env.js                # dotenv loader, typed export of env vars
│   │   ├── supabase.js           # Lazy Supabase client (service role key)
│   │   └── swagger.js            # OpenAPI 3.0 spec (one file, all endpoints)
│   ├── controllers/              # One function per endpoint (thin)
│   ├── data/
│   │   └── menaEvents.json       # Static MENA holidays / events calendar
│   ├── routes/                   # Wire URL -> middleware -> validator -> controller
│   ├── services/                 # Business logic + I/O
│   │   ├── dbService.js          # Reusable Supabase helpers
│   │   ├── mlClient.js           # axios wrapper around the FastAPI service
│   │   ├── campaignService.js
│   │   ├── postService.js
│   │   ├── sentimentService.js
│   │   ├── roiService.js
│   │   ├── workspaceService.js
│   │   ├── socialAccountService.js
│   │   ├── syncedPostService.js
│   │   ├── syncService.js
│   │   ├── analyticsService.js
│   │   ├── insightsService.js
│   │   ├── recommendationsService.js
│   │   └── providers/
│   │       ├── types.js          # Provider contract (JSDoc + PROVIDER_KEYS)
│   │       ├── index.js          # Registry: registerProvider(), getProvider()
│   │       └── metaMockProvider.js
│   ├── validators/               # zod request schemas
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   ├── validate.js           # Generic zod middleware
│   │   └── workspaceContext.js   # Resolves req.workspaceId / req.workspace
│   └── utils/
│       ├── asyncHandler.js
│       └── logger.js
├── .env.example
└── package.json
```

Dependencies: `express`, `cors`, `morgan`, `dotenv`, `axios`, `zod`,
`@supabase/supabase-js`, `swagger-ui-express`. Development only: `nodemon`.

---

## 6. ML service structure

A flat, minimal FastAPI service. All files live under `app/`. A reproducible
data-generation script lives under `scripts/`, and trained artifacts are
written to `models/`.

```
ml-service/
├── app/
│   ├── main.py             # FastAPI app + route handlers
│   ├── schemas.py          # Pydantic request/response models
│   ├── sentiment.py        # Arabic sentiment pipeline (HF transformers)
│   ├── roi_model.py        # Load trained joblib; heuristic fallback
│   ├── preprocess.py       # Arabic text normalisation + ROI feature frame
│   └── train_roi.py        # Train + save the ROI regressor
├── scripts/
│   └── generate_dataset.py # Deterministic synthetic dataset generator
├── data/
│   └── synthetic_campaigns.csv
├── models/
│   ├── roi_model.joblib
│   └── roi_model.metrics.json
└── requirements.txt
```

Dependencies: `fastapi`, `uvicorn`, `pydantic`, `scikit-learn`, `pandas`,
`numpy`, `joblib`, `transformers`, `torch`.

### 6.1. Arabic sentiment

- Model: `CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment` (loaded
  lazily via `@lru_cache`).
- Preprocessing (in `app/preprocess.py`): Unicode NFKC normalisation,
  stripping Arabic diacritics (harakat), removing the tatweel character,
  folding Arabic alef variants to a plain alef, removing URLs / mentions /
  hashtag characters, collapsing character elongation, and whitespace
  collapse. Light, well-known steps from the Arabic NLP literature.
- The model is overridable by setting `HF_SENTIMENT_MODEL`.

### 6.2. ROI regression

- Algorithm: `GradientBoostingRegressor` wrapped in
  `MultiOutputRegressor`, trained with one-hot encoding for the three
  categorical features. Predicts `engagement_rate` and `roi` jointly.
- Holdout metrics on the synthetic dataset (800 rows, 20% test split):
  `engagement_rate` R² ≈ 0.84, `roi` R² ≈ 0.73.
- The confidence score returned to the client is the holdout R² of the
  `roi` target, clipped to `[0.10, 0.95]`. This is a simple, honest proxy
  for the MVP; a more rigorous alternative is noted under _Future
  improvements_.
- If `models/roi_model.joblib` is missing, the endpoint falls back to a
  transparent heuristic with a lower (0.40) confidence score so callers
  can tell the two paths apart.

---

## 7. Supabase as the database layer

Supabase is used purely as a hosted PostgreSQL instance plus a JS client.
No Supabase Auth, no storage, no edge functions, no row-level security in
the beta.

- **Credentials**: the backend connects using the Supabase **service
  role** key. This key bypasses RLS and must **never** be exposed to
  the browser or committed. In `backend/src/config/supabase.js` the
  client is instantiated with `persistSession: false`,
  `autoRefreshToken: false`, `detectSessionInUrl: false`.
- **Schema**: committed as two idempotent files.
  - `backend/db/schema.sql` (v1): `users`, `campaigns`, `posts`,
    `sentiment_results`, `predictions` — each with a UUID primary key
    (`gen_random_uuid()` from `pgcrypto`) and `created_at` /
    `analyzed_at` timestamps.
  - `backend/db/schema_v2.sql` (beta additions, additive only):
    `workspaces`, `social_accounts`, `synced_posts`, `post_metrics`,
    `ai_insights`, plus nullable `workspace_id` columns on `campaigns`
    and `posts`. Run `schema.sql` first, then `schema_v2.sql`.
- **Access layer**: `backend/src/services/dbService.js` centralises
  `insert`, `list`, `getById`, `update`, `remove`. It maps common
  PostgreSQL error codes (`23503` foreign key, `23505` unique, `23514`
  check, `23502` not null) to meaningful HTTP statuses so the generic
  `errorHandler` middleware can surface clean JSON.
- **Workspaces** are the tenant boundary. New rows in `campaigns`,
  `posts`, `social_accounts`, `synced_posts`, `post_metrics`, and
  `ai_insights` are stamped with the active `workspace_id`. When auth
  lands, RLS policies hang off that column.
- **RLS**: disabled in the beta. When a frontend starts using the anon
  key, RLS should be enabled on every table and per-workspace
  `select/insert/update/delete` policies added (commented example at
  the bottom of `schema.sql`).

---

## 8. Prerequisites

- **Node.js 20+** (tested on 22).
- **Python 3.11+** (tested on 3.13).
- A **Supabase project** (free tier is enough).
- ~600 MB of free disk space the first time the Arabic sentiment model
  downloads from Hugging Face.

---

## 9. Setup

### 9.1. Clone the repository

```bash
git clone <this-repo>
cd smartmena-analytics
```

### 9.2. Configure Supabase

1. Create a new project at <https://supabase.com/>.
2. In the Supabase dashboard, open **SQL Editor → New query**, paste the
   contents of `backend/db/schema.sql`, and run it. This creates the
   v1 tables and their indexes.
3. Open a second SQL Editor query, paste the contents of
   `backend/db/schema_v2.sql`, and run it. This adds the beta tables
   (`workspaces`, `social_accounts`, `synced_posts`, `post_metrics`,
   `ai_insights`) and nullable `workspace_id` columns on `campaigns`
   and `posts`. The file is idempotent — safe to re-run.
4. Go to **Project Settings → API**. Copy:
   - **Project URL** → used as `SUPABASE_URL`.
   - **`service_role` secret** → used as `SUPABASE_SERVICE_ROLE_KEY`.
     (**Do not** copy the publishable/anon key for this variable.)

### 9.3. Configure the backend

```bash
cd backend
cp .env.example .env
npm install
```

Edit `backend/.env` and paste your Supabase URL and service-role key.
See section 10 for the full variable list.

### 9.4. Configure the ML service

```bash
cd ../ml-service
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

Generate the synthetic dataset and train the ROI model:

```bash
python scripts/generate_dataset.py
python -m app.train_roi
```

Training writes `models/roi_model.joblib` and
`models/roi_model.metrics.json`. The Arabic sentiment model is *not*
trained locally; it is downloaded from Hugging Face on the first
`/predict-sentiment` request.

---

## 10. Environment variables

All variables are read by the backend's `src/config/env.js`. The ML
service has one optional override (`HF_SENTIMENT_MODEL`) and otherwise
needs no configuration.

| Variable | Service | Required | Default | Purpose |
|---|---|---|---|---|
| `PORT` | backend | no | `4000` | HTTP port |
| `NODE_ENV` | backend | no | `development` | Morgan log format switch |
| `ML_SERVICE_URL` | backend | no | `http://localhost:8000` | Base URL for the FastAPI service |
| `ML_TIMEOUT_MS` | backend | no | `60000` | axios timeout for ML calls; needs to cover the first sentiment cold-start |
| `CORS_ORIGIN` | backend | no | `*` | CORS origin for a future frontend |
| `SUPABASE_URL` | backend | **yes** | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | **yes** | — | Supabase service-role secret (**server-side only**) |
| `HF_SENTIMENT_MODEL` | ml-service | no | `CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment` | Override the Arabic sentiment model |

A sample `.env` is committed as `backend/.env.example`; rotate the
Supabase key before sharing.

---

## 11. How to run the backend

```bash
cd backend
npm run dev          # nodemon, reloads on change
# or
npm start            # node, no reload
```

The server listens on `http://localhost:4000`. Useful URLs:

| URL | Purpose |
|---|---|
| `http://localhost:4000/api/health` | Liveness probe |
| `http://localhost:4000/api/docs` | Interactive Swagger UI |
| `http://localhost:4000/api/docs.json` | Raw OpenAPI 3.0 spec |

---

## 12. How to run the ML service

```bash
cd ml-service
uvicorn app.main:app --reload --port 8000
```

Useful URLs:

| URL | Purpose |
|---|---|
| `http://localhost:8000/health` | Liveness + `roi_model_loaded` flag |
| `http://localhost:8000/docs` | FastAPI's auto-generated Swagger UI |
| `http://localhost:8000/predict-sentiment` | Arabic sentiment |
| `http://localhost:8000/predict-roi` | ROI + engagement regression |

> **First request latency.** The first call to
> `/predict-sentiment` downloads the Arabic BERT model (~500 MB). That
> single request can take 10–30 seconds on a cold start; subsequent
> calls are sub-second. The backend's default `ML_TIMEOUT_MS=60000` is
> sized for this.

---

## 12b. How to run the frontend

```bash
cd frontend
cp .env.example .env.local       # set NEXT_PUBLIC_API_BASE_URL
npm install
npm run dev
```

The frontend listens on `http://localhost:3000` and proxies all data
calls to the backend via `NEXT_PUBLIC_API_BASE_URL` (defaults to
`http://localhost:4000`). Pages:

| Path | Purpose |
|---|---|
| `/` | Dashboard: KPIs, engagement timeseries, platform + sentiment breakdowns, top posts, latest insights |
| `/connections` | Mock-connect Meta accounts, trigger a sync, disconnect |
| `/posts` | Filterable list of synced posts |
| `/campaigns` | List, create, and drill into campaigns with ROI predictions |
| `/insights` | Browse and regenerate bilingual AI insights |
| `/recommendations` | Request a MENA playbook for a candidate post |
| `/settings` | Manage workspaces and defaults |

The AR / EN toggle in the top bar flips the document direction
(`rtl` / `ltr`) and swaps translations; the locale persists in
localStorage.

---

## 13. Example API requests

All examples below assume `curl` on Windows PowerShell; on Unix, replace
the line-continuation `` ` `` with `\`.

### 13.1. Health

```bash
curl http://localhost:4000/api/health
```

```json
{ "status": "ok", "service": "smartmena-backend", "uptime": 12.3, "timestamp": "2026-04-20T10:30:00.000Z" }
```

### 13.2. Create a campaign

```bash
curl -X POST http://localhost:4000/api/campaigns `
  -H "Content-Type: application/json" `
  -d '{
    "user_id": "a1b2c3d4-5e6f-47a8-9b0c-1d2e3f4a5b6c",
    "campaign_name": "Ramadan Sale 2026",
    "platform": "instagram",
    "budget": 750,
    "audience_size": 25000,
    "content_type": "reel",
    "posting_time": "2026-03-15T19:00:00.000Z",
    "region": "AE"
  }'
```

### 13.3. Create a post

```bash
curl -X POST http://localhost:4000/api/posts `
  -H "Content-Type: application/json" `
  -d '{
    "campaign_id": "f3e9e4e0-5e6f-47a8-9b0c-1d2e3f4a5b6c",
    "text_content": "المنتج ممتاز جداً وأنصح به بشدة",
    "language": "ar"
  }'
```

### 13.4. Analyse sentiment

```bash
curl -X POST http://localhost:4000/api/analyze/sentiment `
  -H "Content-Type: application/json" `
  -d '{
    "postId": "b2c3d4e5-6f7a-48b9-90c1-2d3e4f5a6b7c",
    "text": "المنتج ممتاز جداً وأنصح به بشدة"
  }'
```

Response:

```json
{ "postId": "b2c3d4e5-6f7a-48b9-90c1-2d3e4f5a6b7c", "sentiment": "positive", "confidence": 0.98 }
```

### 13.5. Predict ROI

```bash
curl -X POST http://localhost:4000/api/predict/roi `
  -H "Content-Type: application/json" `
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

Response:

```json
{
  "campaignId": "f3e9e4e0-5e6f-47a8-9b0c-1d2e3f4a5b6c",
  "predictedRoi": 10.4479,
  "predictedEngagement": 0.1347,
  "confidenceScore": 0.7346
}
```

---

## 13b. Beta endpoints worth trying

The beta endpoints are identical in shape to the v1 ones — JSON in,
JSON out, no auth. Full schema lives in Swagger UI at
`http://localhost:4000/api/docs` and in `docs/api.md`. A typical
end-to-end flow to populate the dashboard:

```bash
# 1. Resolve (and silently create) the demo workspace
curl http://localhost:4000/api/workspaces/current

# 2. Mock-connect an Instagram account
curl -X POST http://localhost:4000/api/social-accounts/connect/meta `
  -H "Content-Type: application/json" `
  -d '{ "kind": "instagram", "handle": "acme_me" }'

# 3. Sync the account (fabricates ~24 bilingual posts + metrics)
curl -X POST http://localhost:4000/api/social-accounts/<id>/sync `
  -H "Content-Type: application/json" `
  -d '{ "limit": 24, "daysBack": 30 }'

# 4. Generate AI insights for the workspace
curl -X POST http://localhost:4000/api/insights/generate

# 5. Read the dashboard
curl http://localhost:4000/api/analytics/overview
curl "http://localhost:4000/api/analytics/timeseries?metric=engagement&groupBy=day"
curl http://localhost:4000/api/insights

# 6. Request a MENA playbook
curl -X POST http://localhost:4000/api/recommendations/mena `
  -H "Content-Type: application/json" `
  -d '{ "platform": "instagram", "region": "AE", "contentType": "reel", "budget": 500, "audienceSize": 20000 }'
```

---

## 14. Limitations of the current MVP

- **No authentication.** Any client that can reach the backend can call
  any endpoint. Supabase RLS is disabled.
- **Synthetic ROI data.** All training data is programmatically generated
  by `scripts/generate_dataset.py`. Accuracy figures are relative to that
  generator and do not reflect real campaign returns.
- **Pretrained sentiment only.** No fine-tuning was performed, so
  dialect-heavy or domain-specific (ad-reply) text may be misclassified
  more often than MSA.
- **Confidence scores are proxies.** For ROI, the returned
  `confidence_score` is a clipped holdout R², not a per-sample
  uncertainty estimate. Extreme inputs can be extrapolated and then
  clipped at `roi = 0`, which reads as "do not run this campaign".
- **Cold start on sentiment.** The first request blocks for the
  Hugging Face model download. Warming on startup is not yet wired in.
- **No CI/CD, no containers.** Running locally is the supported path.
- **Single-process ML service.** Running `uvicorn --workers N` would load
  a separate model copy per worker (~500 MB each).
- **English keyword fallback removed.** The sentiment endpoint assumes
  the input is Arabic; English-only text will be tokenised by an Arabic
  tokenizer and results will be unreliable.

---

## 15. Future improvements

Research / modelling

- Fine-tune the Arabic sentiment model on a small labelled set of MENA
  marketing comments (Gulf, Levantine, Egyptian dialects).
- Replace the constant confidence score with quantile regression or a
  bagged ensemble to produce per-sample intervals.
- Pin the Hugging Face model to a specific `revision=` commit hash for
  full academic reproducibility.
- Train the ROI model on real campaign data once available and compare
  feature importances against the synthetic baseline.

Engineering

- Add Supabase Auth and turn on RLS; migrate the anon/service-role
  separation to the frontend once it exists.
- Add automated tests: unit tests for `preprocess.clean_text` and the
  `mlClient` error translation, plus an integration test hitting a real
  Supabase free-tier project.
- Warm the sentiment pipeline on `uvicorn` startup (or bake the model
  download into a future Docker image).
- Containerise both services and add a `docker-compose` for a one-command
  local run.
- Add GitHub Actions: lint, test, generate dataset, train, check that
  the joblib artifact loads.
- Expose a small React / Next.js frontend consuming the OpenAPI spec
  under `/api/docs.json`. *(Done in the beta — see `frontend/`.)*
- Replace the mock Meta provider with a real Meta Graph API adapter
  using the same contract, plus TikTok and X adapters.
- Move the sync runner off the inline request path onto a queue
  (e.g. BullMQ / Supabase Edge Functions) once real providers land.

Security

- Rotate and remove the service-role key that currently sits in
  `backend/.env.example`; use a placeholder instead.
- Add rate-limiting on the ML-proxy endpoints so an attacker cannot
  burn Hugging Face inference time via the public backend.

---

## 16. Provider interface (for future TikTok / X drop-ins)

All social platforms are loaded through a small adapter layer so the
rest of the backend never has to know whether data came from Meta's
Graph API, TikTok's Content API, X's v2 API, or a local mock. The
contract is defined (as JSDoc) in
`backend/src/services/providers/types.js` and the registry lives in
`backend/src/services/providers/index.js`.

**Keys** (used both in the DB column `social_accounts.provider` and in
`PROVIDER_KEYS`):

```
meta_instagram | meta_facebook | tiktok | x
```

**Required methods** (all async, all return plain objects):

| Method                                | Returns                   | Purpose                                                        |
| ------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| `beginOAuth(input)`                   | `{ authUrl, state }`      | Start the OAuth handshake. Real providers only.                |
| `completeOAuth(input)`                | `NormalizedAccount`       | Finish OAuth (or fabricate, for mocks) and return the account. |
| `fetchAccountInfo(account)`           | `NormalizedAccount`       | Refresh account metadata on demand.                            |
| `listPosts(account, options)`         | `NormalizedPost[]`        | Fetch recent posts for an account. `options = { limit, daysBack }`. |
| `fetchPostMetrics(account, post)`     | `NormalizedMetrics`       | Fetch a single metrics snapshot for one post.                  |

**Normalised shapes** (camelCase, platform-agnostic, see
`types.js` for JSDoc):

```
NormalizedAccount = {
  provider, externalAccountId, handle?, displayName?, avatarUrl?,
  profileUrl?, accessTokenCiphertext?, tokenExpiresAt?, isMock, metadata?
}

NormalizedPost = {
  externalPostId, postType, caption?, captionLang?, mediaUrl?,
  permalink?, postedAt?, raw?, metrics?
}

NormalizedMetrics = {
  capturedAt?, likes?, comments?, shares?, saves?, impressions?,
  reach?, videoViews?, engagementRate?
}
```

**Registering a new provider**:

```js
// backend/src/services/providers/tiktokProvider.js
const tiktokProvider = {
  async beginOAuth(input)                { /* ... */ },
  async completeOAuth(input)             { /* ... */ },
  async fetchAccountInfo(account)        { /* ... */ },
  async listPosts(account, options)      { /* ... */ },
  async fetchPostMetrics(account, post)  { /* ... */ },
};
module.exports = tiktokProvider;

// backend/src/services/providers/index.js
const tiktokProvider = require("./tiktokProvider");
registerProvider("tiktok", tiktokProvider);
```

That is the **only** change required to light up TikTok end-to-end —
connect, sync, dashboard, insights, recommendations all flow through
the same services (`socialAccountService`, `syncService`,
`syncedPostService`, `analyticsService`, `insightsService`) without
further modification.

The beta ships `metaMockProvider` under both `meta_instagram` and
`meta_facebook` keys. Its output is deterministic (seeded on the
external account id) so syncs are reproducible across restarts.

---

## Authorship

Final-year project, 2026. Backend, ML service, frontend, dataset design
and documentation by the repository author. This repository is shared
as an academic artifact rather than a production system.
