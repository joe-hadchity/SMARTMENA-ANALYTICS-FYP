# Architecture

SmartMENA Analytics is a two-service MVP. The Express backend is the only
public entry point; the FastAPI ML service is an internal peer; all
persistent state lives in a Supabase-hosted PostgreSQL database. Each
component has a single well-defined responsibility, and the interfaces
between them are small and text-based (JSON over HTTP, SQL over the
Supabase client).

```
+---------------------+          +-------------------------+
|  Client             |  HTTPS   |  Express backend        |
|  (curl / Postman /  +--------->+  Node.js, MVC           |
|   future frontend)  |          |  :4000                  |
+---------------------+          |                         |
                                 |  routes -> controllers  |
                                 |  -> services            |
                                 |     - mlClient  --------+----> FastAPI ML service
                                 |     - dbService         |      Python, :8000
                                 +-----------+-------------+      /predict-sentiment
                                             |                    /predict-roi
                                             | supabase-js        /health
                                             v
                                 +-------------------------+
                                 |  Supabase PostgreSQL    |
                                 |  users, campaigns,      |
                                 |  posts,                 |
                                 |  sentiment_results,     |
                                 |  predictions            |
                                 +-------------------------+
```

---

## 1. Express backend

The Express backend (`backend/`) is a plain JavaScript application using a
conventional MVC layout. It is the only public-facing process and it owns
the full HTTP contract.

### 1.1. Layer responsibilities

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `src/routes/` | Bind URLs to (validator, controller) pairs |
| Validators | `src/validators/` | `zod` schemas for every request body |
| Middleware | `src/middleware/` | `validate`, `errorHandler`, `notFound` |
| Controllers | `src/controllers/` | One function per endpoint, intentionally thin |
| Services | `src/services/` | Business logic + all side effects |
| Config | `src/config/` | `env`, `supabase` client, `swagger` spec |
| Utils | `src/utils/` | `asyncHandler`, `logger` |

Two services are deliberately cross-cutting and reusable:

- **`mlClient.js`** owns every outbound HTTP call to the FastAPI service.
  It contains the single axios instance, the timeout (`ML_TIMEOUT_MS`,
  default 60 s), the translation between the backend's public
  **camelCase** contract and the ML service's internal **snake_case**
  contract, and a `wrapMlError` helper that maps connection failures,
  timeouts, and upstream HTTP statuses to friendly HTTP statuses on the
  way out (503 / 504 / 502).
- **`dbService.js`** owns every call to Supabase. It wraps `insert`,
  `list`, `getById`, `update`, `remove` and maps common PostgreSQL error
  codes (`23503` foreign-key, `23505` unique, `23514` check, `23502`
  not-null) to meaningful HTTP statuses so the generic `errorHandler`
  middleware can surface consistent JSON.

### 1.2. Request lifecycle (example: `POST /api/analyze/sentiment`)

```
route (analyzeRoutes.js)
  -> validate(analyzeSentimentSchema)          # 400 on schema violation
  -> asyncHandler(analyzeSentiment controller) # thin: passes body to service
      -> sentimentService.analyzeSentiment
          -> mlClient.predictSentiment(text)   # 502/503/504 on ML issues
          -> dbService.insert("sentiment_results", ...)  # 400/409/503 on DB
          <- { postId, sentiment, confidence }
  <- 200 JSON
```

Every failure path produces `{ message, details? }` — a single error shape.

### 1.3. Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/health` | Liveness probe |
| `POST` | `/api/campaigns` | Create a campaign |
| `POST` | `/api/posts` | Create a post linked to a campaign |
| `POST` | `/api/analyze/sentiment` | Classify Arabic post text (proxied to ML) |
| `POST` | `/api/predict/roi` | Predict ROI + engagement (proxied to ML) |
| `GET`  | `/api/docs` | Interactive Swagger UI |
| `GET`  | `/api/docs.json` | Raw OpenAPI 3.0 specification |

---

## 2. Supabase database layer

Supabase is used purely as a hosted PostgreSQL instance plus an
officially-maintained JavaScript client (`@supabase/supabase-js`). No
Supabase Auth, no Storage, no Edge Functions, and no Row-Level Security
policies are used in the MVP.

### 2.1. Schema

Five tables, defined as a single idempotent script at
`backend/db/schema.sql`:

| Table | Purpose | Key foreign keys |
|---|---|---|
| `users` | Account records (no auth yet — `password_hash` nullable) | — |
| `campaigns` | A marketing campaign on a specific platform | `user_id → users.id` |
| `posts` | Text content associated with a campaign | `campaign_id → campaigns.id` |
| `sentiment_results` | One row per sentiment analysis call | `post_id → posts.id` |
| `predictions` | One row per ROI prediction call | `campaign_id → campaigns.id` |

All primary keys are UUIDs generated by `gen_random_uuid()` (via the
`pgcrypto` extension). Every table carries a `timestamptz` audit column
(`created_at` or `analyzed_at`). `sentiment_results` enforces the label
via `CHECK (sentiment IN ('positive','negative','neutral'))`, and both
`sentiment_results.confidence` and `predictions.confidence_score` carry
`CHECK (... >= 0 AND ... <= 1)`.

All foreign keys are `ON DELETE CASCADE`, so deleting a campaign
transparently removes its posts, sentiments and predictions.

### 2.2. Credentials and safety

The backend connects with the Supabase **service-role** key. This key
**bypasses RLS** and must never be exposed to a browser. In
`backend/src/config/supabase.js` the client is constructed with
`persistSession: false`, `autoRefreshToken: false`,
`detectSessionInUrl: false` — it is a server-only singleton, lazily
initialised so that the backend can boot even when the env vars are
missing (requests will then fail with a clean 503 from `dbService`).

### 2.3. Data flow through Supabase

```
POST /api/campaigns      -> dbService.insert("campaigns", row)
POST /api/posts          -> dbService.insert("posts", row)
POST /api/analyze/sentiment
  -> mlClient.predictSentiment(text)
  -> dbService.insert("sentiment_results", { post_id, sentiment, confidence })
POST /api/predict/roi
  -> mlClient.predictRoi(features)
  -> dbService.insert("predictions",
         { campaign_id, predicted_roi, predicted_engagement, confidence_score })
```

The backend always returns the persisted row (with its DB-assigned `id`
and `created_at`) rather than the pre-insert payload, so clients observe
exactly what is in the database.

---

## 3. FastAPI ML service

The ML service (`ml-service/`) is a minimal FastAPI application. It is
stateless with respect to the database: it never reads from or writes to
Supabase. Every request is self-contained; persistence is the backend's
job.

### 3.1. Structure

```
ml-service/
├── app/
│   ├── main.py             # FastAPI app + 3 route handlers
│   ├── schemas.py          # Pydantic request/response models
│   ├── sentiment.py        # HF pipeline (Arabic BERT)
│   ├── roi_model.py        # joblib bundle + heuristic fallback
│   ├── preprocess.py       # Arabic text + ROI feature helpers
│   └── train_roi.py        # Offline training entry point
├── scripts/
│   └── generate_dataset.py # Deterministic synthetic dataset generator
├── data/synthetic_campaigns.csv
└── models/
    ├── roi_model.joblib
    └── roi_model.metrics.json
```

### 3.2. Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/health` | Liveness + `roi_model_loaded` flag |
| `POST` | `/predict-sentiment` | Arabic sentiment (positive / negative / neutral + confidence) |
| `POST` | `/predict-roi` | Multi-output regression: `predicted_roi`, `predicted_engagement`, `confidence_score` |
| `GET`  | `/docs` | FastAPI's auto-generated Swagger UI |

### 3.3. Arabic sentiment

- Model: `CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment`. The `-da-`
  variant handles dialectal Arabic in addition to MSA, which matches the
  MENA SME use case.
- Loading strategy: `@lru_cache(maxsize=1)` around a lazy loader.
  `uvicorn` boots instantly; the first `/predict-sentiment` call absorbs
  the ~500 MB model download and the ~5–10 s initialisation; every
  subsequent call hits the in-memory pipeline.
- Preprocessing (`preprocess.clean_text`): NFKC normalisation, removal of
  Arabic diacritics (harakat), tatweel, URLs, mentions, hashtag
  characters, alef-hamza folding, Arabic-ya / ta-marbuta folding, and
  elongation collapse. Deliberately light — the BERT tokenizer does the
  heavy lifting.
- Override: set `HF_SENTIMENT_MODEL=<repo_id>` before launching
  `uvicorn` to plug in a different Arabic checkpoint (e.g. MARBERT).

### 3.4. ROI regression

- Pipeline: `ColumnTransformer` (`OneHotEncoder` for `platform`,
  `content_type`, `region`; pass-through for the five numeric features)
  wrapping a `MultiOutputRegressor` over a
  `GradientBoostingRegressor(n_estimators=300, max_depth=3, learning_rate=0.05)`.
- Two targets predicted jointly: `engagement_rate` and `roi`.
- Artifact: `models/roi_model.joblib` is a dict
  `{ pipeline, targets, metrics }`. `metrics` includes per-target MAE,
  RMSE, and R² on a fixed 80/20 holdout split, plus `n_train` / `n_test`.
- Confidence score: the holdout ROI R² clipped to `[0.10, 0.95]`. This
  is a simple, honest proxy acknowledged as future work.
- Fallback: if `roi_model.joblib` is missing (e.g. before the first
  training run), `roi_model.py` returns a transparent hand-coded
  heuristic with a lower (0.40) confidence so callers can detect the
  degraded path.

---

## 4. How Express and FastAPI communicate

- **Transport**: plain HTTP/1.1, JSON bodies, `Content-Type: application/json`.
- **Topology**: the FastAPI service is addressed by its base URL only
  (`ML_SERVICE_URL`). The backend sees it as a single logical dependency,
  not a class of services.
- **Client**: one `axios` instance in `backend/src/services/mlClient.js`
  with a configurable timeout (`ML_TIMEOUT_MS`). Two helpers:
  `predictSentiment(text)` and `predictRoi(features)`.
- **Naming convention translation**: the public API uses camelCase
  (`campaignId`, `postingHour`, `sentimentScore`). The ML service uses
  snake_case (`campaign_id`, `posting_hour`, `sentiment_score`). That
  translation happens in **exactly one place** — inside `mlClient` — so
  no other layer needs to know both conventions.
- **Error translation**: `wrapMlError` maps:

  | Cause | Returned status |
  |---|---|
  | TCP / DNS failure (`ECONNREFUSED`, no response) | `503 ML service unreachable` |
  | `ECONNABORTED` (axios timeout) | `504 ML service timed out` |
  | Upstream `503` | `503 ML service is not ready` |
  | Upstream `4xx` | `400 ML service rejected the request` |
  | Upstream other `5xx` | `502 ML service error` |

- **Shape guarding**: the service layers (`sentimentService`,
  `roiService`) also verify the *shape* of the ML response
  (`typeof === "number"`, expected label in allowed set) before writing
  to the database, and return `502 ML service returned an invalid payload`
  if the upstream drifts. This keeps the database clean and avoids
  PostgreSQL `CHECK` violations bubbling up as raw 500s.
- **No auth between services**: the backend trusts the ML service and
  vice versa because they share a host / private network. Once the
  system is deployed, a shared secret header or mTLS is the natural
  next step (noted in the README's _Future improvements_).

---

## 5. Why Supabase for rapid MVP development

The FYP deliberately avoids self-hosting PostgreSQL, running an ORM, or
writing migration tooling. Supabase was chosen because it collapses
several infrastructure concerns into one free-tier service:

- **Managed PostgreSQL in minutes.** A new project gives you an empty
  `public` schema, `pgcrypto` enabled on request, and automatic backups
  without any server provisioning.
- **SQL-first.** Tables are defined in a single committed file
  (`backend/db/schema.sql`) and created by pasting it into the Supabase
  SQL editor. This keeps the schema version-controlled and reviewable
  without an additional migration framework.
- **Zero-ORM client.** `@supabase/supabase-js` is a thin REST wrapper over
  the PostgREST API. Chained query builders (`supabase.from("campaigns").
  insert(row).select().single()`) are enough for CRUD on the MVP and do
  not need Prisma / TypeORM / Sequelize.
- **Service-role secret for trusted backends.** A single
  `SUPABASE_SERVICE_ROLE_KEY` is enough to talk to every table from a
  server; RLS is disabled for the MVP and can be enabled later without
  rewriting the access layer.
- **Growth path.** If the project later needs Auth, Storage or Edge
  Functions, Supabase offers them on the same project without a
  migration. If Supabase is outgrown, the underlying database is
  standard PostgreSQL and the access layer is a 150-line JS module, so
  exit cost is low.

The alternative — running PostgreSQL in Docker, provisioning a
persistent volume, writing a Prisma schema and migration pipeline, and
managing role / permission seeding — would have consumed days that were
better spent on the ML side of the project.

---

## 6. Why pretrained sentiment and synthetic ROI data

The FYP has a hard scope: **two working ML endpoints**, explainable,
defensible, and demoable. Training real models end-to-end was treated as
out of scope.

### 6.1. Pretrained Arabic sentiment

- **No labelled Arabic marketing data** exists for the project, and
  collecting + annotating it to a defensible quality would have taken
  weeks. Buying annotation is out of scope.
- **CAMeL-Lab CAMeLBERT-DA** is a published baseline
  (Inoue et al., WANLP 2021) fine-tuned on MSA + dialectal sentiment
  data. It is widely cited, reproducible, and — critically — handles
  the MSA + dialect mix that MENA SMEs see.
- **No fine-tuning** keeps the experimental surface small: there is
  exactly one model to describe, one Hugging Face revision to pin,
  and zero training infrastructure. Future work lists dialect-specific
  fine-tuning explicitly.

### 6.2. Synthetic ROI data

- **Real ad-spend / revenue data is not obtainable** at the scale this
  project needs (800+ campaigns across four platforms and five
  countries) without a commercial relationship with SMEs.
- **A deterministic synthetic generator** (`scripts/generate_dataset.py`)
  lets the ROI regression be trained, evaluated, and explained in one
  commit. Every relationship in the data is documented: TikTok > Instagram >
  Facebook > Twitter on engagement; reel > video > carousel > image >
  story on content type; UAE/SA > Lebanon/Jordan > Egypt on purchasing
  power; holiday +20 %; quadratic peak in posting hour; diminishing
  returns on budget; audience dilution on engagement rate.
- **Reproducibility.** The generator is seeded (`--seed 42`) so every
  run produces the same CSV, every training run produces the same
  joblib, and the reported metrics (engagement R² ≈ 0.84, ROI R² ≈ 0.73)
  can be reproduced on any machine in under a minute.
- **Honesty.** The README, the module docstrings, and the dataset
  header all make clear that this is *prototype* data, not real
  campaign performance.

Shipping both of these as synthetic / pretrained for the MVP keeps the
focus of the write-up on the **system**: the API boundary, the service
split, the data layer, the error model, and the explainability of the
chosen ML components.
