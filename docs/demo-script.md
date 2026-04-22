# Demo script — supervisor walkthrough

This document is the step-by-step script for demonstrating the
SmartMENA Analytics MVP to the supervisor. It should take **5–8 minutes**
to run end-to-end once both services are already started.

The demo exercises the full system:

```
create campaign  ->  create post  ->  analyze sentiment  ->  predict ROI
  Supabase           Supabase         ML + Supabase         ML + Supabase
```

All endpoints are behind the Express backend at `http://localhost:4000`.
The FastAPI ML service is internal — the supervisor never sees it
directly.

---

## 0. Prerequisites (do this before the supervisor arrives)

### 0.1. Supabase project

1. Open the Supabase SQL editor.
2. Run `backend/db/schema.sql` in full. This creates the five tables
   (`users`, `campaigns`, `posts`, `sentiment_results`, `predictions`)
   and enables the `pgcrypto` extension.
3. Seed a demo user — every campaign requires `user_id`:

    ```sql
    insert into public.users (name, email)
    values ('Demo User', 'demo@smartmena.local')
    returning id;
    ```

   Copy the returned UUID. Call it `USER_ID` for the rest of the demo.

### 0.2. Environment files

`backend/.env`:

```
PORT=4000
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8000
ML_TIMEOUT_MS=60000
CORS_ORIGIN=*
SUPABASE_URL=https://<your-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`ml-service/.env` (optional — defaults are fine):

```
HF_SENTIMENT_MODEL=CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment
```

### 0.3. Start both services

Terminal 1 — ML service:

```powershell
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Terminal 2 — backend:

```powershell
cd backend
npm install
npm run dev
```

### 0.4. Warm up the sentiment model

The Arabic BERT model (~500 MB) is lazy-loaded on the first
`/predict-sentiment` call and takes ~10 seconds the first time. Fire
one throw-away request **before** the supervisor arrives so the live
demo feels instant:

```powershell
curl -X POST http://localhost:8000/predict-sentiment `
  -H "Content-Type: application/json" `
  -d '{\"text\":\"المنتج ممتاز\"}'
```

### 0.5. Pre-flight checks

All three of these must return quickly:

```powershell
curl http://localhost:4000/api/health
curl http://localhost:8000/health
start http://localhost:4000/api/docs
```

---

## 1. Opening — show the system shape (≈ 60 s)

Talking points while you open the Swagger UI (`/api/docs`):

- "The backend is a Node.js Express service; this is the only thing the
  outside world talks to. The ML is a separate FastAPI process, and
  the database is Supabase — managed PostgreSQL."
- Point at the five endpoints in Swagger:
  - `GET /api/health` — liveness.
  - `POST /api/campaigns` — create a campaign.
  - `POST /api/posts` — create a post linked to a campaign.
  - `POST /api/analyze/sentiment` — Arabic sentiment, proxied to ML,
    persisted in Supabase.
  - `POST /api/predict/roi` — ROI regression, proxied to ML,
    persisted in Supabase.

Then say: "We'll now walk through a realistic SME flow — a Lebanese
restaurant launching a campaign on Instagram."

---

## 2. Step 1 — Create a campaign (≈ 60 s)

**What this shows:** the backend writing to Supabase through the
service-role key, with full input validation via `zod`.

Request:

```powershell
curl -X POST http://localhost:4000/api/campaigns `
  -H "Content-Type: application/json" `
  -d '{
    \"user_id\": \"<USER_ID>\",
    \"campaign_name\": \"Ramadan Iftar Promo\",
    \"platform\": \"instagram\",
    \"budget\": 1500,
    \"audience_size\": 50000,
    \"content_type\": \"reel\",
    \"posting_time\": \"2026-03-12T19:00:00Z\",
    \"region\": \"LB\"
  }'
```

Expected response (`201 Created`):

```json
{
  "id": "c1a2b3c4-...",
  "user_id": "<USER_ID>",
  "campaign_name": "Ramadan Iftar Promo",
  "platform": "instagram",
  "budget": "1500.00",
  "audience_size": 50000,
  "content_type": "reel",
  "posting_time": "2026-03-12T19:00:00+00:00",
  "region": "LB",
  "created_at": "..."
}
```

**Copy the `id`. Call it `CAMPAIGN_ID`** — every subsequent step uses it.

Point out to the supervisor:

- Zod validator (`backend/src/validators/campaignValidator.js`) enforces
  that `platform` is one of `facebook | instagram | tiktok | google | x`,
  `budget` is a non-negative number, and `posting_time` is ISO 8601.
- The response is **the row as it was persisted** — Supabase returned
  it via `.select().single()`. What the supervisor sees on screen is
  literally what is in the database.

(Optional, for effect: open the Supabase table editor and refresh
`public.campaigns` — the new row is there.)

---

## 3. Step 2 — Create a post (≈ 45 s)

**What this shows:** a foreign-key relationship enforced by
PostgreSQL, surfaced as a clean 400 if it fails.

Request (write the Arabic copy the SME will actually publish):

```powershell
curl -X POST http://localhost:4000/api/posts `
  -H "Content-Type: application/json" `
  -d '{
    \"campaign_id\": \"<CAMPAIGN_ID>\",
    \"text_content\": \"إفطار رمضاني مميّز بأطباق شرقية لذيذة. احجز طاولتك الآن!\",
    \"language\": \"ar\"
  }'
```

Expected response (`201 Created`):

```json
{
  "id": "p1a2b3c4-...",
  "campaign_id": "<CAMPAIGN_ID>",
  "text_content": "إفطار رمضاني مميّز بأطباق شرقية لذيذة. احجز طاولتك الآن!",
  "language": "ar",
  "created_at": "..."
}
```

**Copy the `id`. Call it `POST_ID`.**

Optional: show what happens on a bad FK — it is a clean 400, not a 500:

```powershell
curl -X POST http://localhost:4000/api/posts `
  -H "Content-Type: application/json" `
  -d '{ \"campaign_id\": \"00000000-0000-4000-8000-000000000000\",
         \"text_content\": \"test\", \"language\": \"ar\" }'
```

Response:

```json
{ "message": "Invalid foreign key reference", "details": "..." }
```

This is `dbService.js` translating PostgreSQL error code `23503` into
an HTTP 400.

---

## 4. Step 3 — Analyze sentiment (≈ 90 s)

**What this shows:** the backend calling the FastAPI ML service,
guarding the response, and writing to Supabase.

Request:

```powershell
curl -X POST http://localhost:4000/api/analyze/sentiment `
  -H "Content-Type: application/json" `
  -d '{
    \"postId\": \"<POST_ID>\",
    \"text\": \"إفطار رمضاني مميّز بأطباق شرقية لذيذة. احجز طاولتك الآن!\"
  }'
```

Expected response (`200 OK`):

```json
{
  "postId": "<POST_ID>",
  "sentiment": "positive",
  "confidence": 0.9732
}
```

Talking points (≈ 45 s):

- "The backend did not run the model itself. It called the FastAPI
  service at `/predict-sentiment` through a single shared axios client
  (`mlClient.js`) with a 60 s timeout."
- "The ML service is running the **CAMeL-Lab CAMeLBERT-DA** model — a
  published Arabic sentiment BERT trained on MSA and dialectal data.
  That's why dialect like *'مميّز'* and *'إفطار'* is handled
  correctly."
- "Before we persist, the backend checks the response shape — if
  FastAPI ever returned an unexpected label we would return 502
  instead of corrupting the database."
- "The row is persisted in `sentiment_results` with a CHECK
  constraint on the label, and with `post_id` as a foreign key to
  `posts` — cascade delete."

Optional contrast — run a negative example:

```powershell
curl -X POST http://localhost:4000/api/analyze/sentiment `
  -H "Content-Type: application/json" `
  -d '{ \"postId\": \"<POST_ID>\",
         \"text\": \"الخدمة سيئة جدا والطعام بارد. لن أعود مرة أخرى.\" }'
```

Expected: `sentiment: "negative"` with high confidence.

Note (honest caveat to mention if the supervisor asks): this second
call **writes a second row** to `sentiment_results` for the same
`post_id`. The MVP does not deduplicate; analysis is idempotent at
the ML level but not at the storage level. Upserting per `post_id`
is listed in the README as future work.

---

## 5. Step 4 — Predict ROI (≈ 90 s)

**What this shows:** the second ML endpoint, with a different shape of
model (tabular regression on synthetic data), still accessed through
the same boundary and the same error-translation layer.

Request — reuse the numbers from the campaign you just created:

```powershell
curl -X POST http://localhost:4000/api/predict/roi `
  -H "Content-Type: application/json" `
  -d '{
    \"campaignId\": \"<CAMPAIGN_ID>\",
    \"budget\": 1500,
    \"platform\": \"instagram\",
    \"contentType\": \"reel\",
    \"audienceSize\": 50000,
    \"postingHour\": 19,
    \"sentimentScore\": 0.95,
    \"holidayFlag\": 1,
    \"region\": \"Lebanon\"
  }'
```

Expected response (`200 OK`, exact numbers vary slightly by training
seed but the shape is fixed):

```json
{
  "campaignId": "<CAMPAIGN_ID>",
  "predictedRoi": 2.84,
  "predictedEngagement": 0.072,
  "confidenceScore": 0.7312
}
```

Talking points (≈ 60 s):

- "`sentimentScore: 0.95` is the output of the previous step, pushed
  in as a feature. In production these two endpoints would chain
  automatically; for the MVP we wire them manually to keep the API
  honest."
- "The model is a `GradientBoostingRegressor` wrapped in
  `MultiOutputRegressor`, predicting **two targets at once**:
  `engagement_rate` and `roi`. Categorical features (`platform`,
  `content_type`, `region`) go through `OneHotEncoder`; numeric
  features pass through. Training data is **synthetic** — 800 rows
  generated by a deterministic seeded script with documented
  relationships."
- "The `confidenceScore` is the holdout R² of the ROI target from
  training, clipped to [0.10, 0.95]. It is not a Bayesian
  uncertainty estimate; we are honest about that in the README."

### Contrast run (shows the model responds to features)

Change just the two most impactful inputs — platform and content type —
and re-run:

```powershell
curl -X POST http://localhost:4000/api/predict/roi `
  -H "Content-Type: application/json" `
  -d '{
    \"campaignId\": \"<CAMPAIGN_ID>\",
    \"budget\": 1500,
    \"platform\": \"twitter\",
    \"contentType\": \"image\",
    \"audienceSize\": 50000,
    \"postingHour\": 3,
    \"sentimentScore\": -0.4,
    \"holidayFlag\": 0,
    \"region\": \"Lebanon\"
  }'
```

The `predictedEngagement` and `predictedRoi` drop noticeably. Say:

- "The drop is consistent with the baked-in patterns of the synthetic
  dataset: TikTok/Instagram outperform Twitter for engagement; reels
  outperform images; posting at 3 AM is outside the evening peak;
  negative sentiment kills ROI; no holiday lift. That's the model
  behaving sensibly — it is not just memorising."

---

## 6. Closing — explain the results and the system (≈ 60 s)

Bring up the Swagger UI one more time and summarise:

- **Two ML endpoints, one backend, one database.** Every call the
  supervisor just made went through the same validate → controller →
  service layering, the same error-translation module, and the same
  Supabase singleton.
- **Explainability.** The sentiment model is a published checkpoint
  cited in a WANLP paper; the ROI model is a GradientBoostingRegressor
  on a synthetic dataset whose generator script is committed and
  reproducible (`--seed 42`). There is no black box in this demo that
  we can't open.
- **What's persisted.** Every interaction left a row in Supabase:
  `campaigns` (1), `posts` (1), `sentiment_results` (1–2),
  `predictions` (1–2). Opening the Supabase table editor makes this
  concrete.
- **What is intentionally out of scope for the MVP.** No auth, no
  dashboard UI, no real ad-spend data, no fine-tuned sentiment model,
  no rate limiting, no queueing. These are all listed as _Future
  improvements_ in the README.

### Recovery talking points (in case something fails mid-demo)

- **`503 ML service unreachable` on `/api/analyze/sentiment`**: the
  `uvicorn` process died. This is the `mlClient.wrapMlError` path —
  the backend did not return a 500. Restart `uvicorn` and retry.
- **`503 Supabase is not configured`**: the `.env` is missing or the
  service was started before it was populated. The Supabase client is
  lazy-initialised, so editing `.env` and restarting the backend is
  enough.
- **First sentiment call is slow**: you forgot the warm-up in step 0.4.
  Say so openly — it is the one-time HF model download.
- **Unexpected sentiment label on a marginal Arabic sentence**:
  acknowledge honestly. The MVP uses a pretrained model with no
  fine-tuning on marketing data; dialect-specific fine-tuning is the
  next deliverable.

---

## Appendix — one-page command cheat sheet

Copy-paste sequence, assuming `USER_ID`, `CAMPAIGN_ID`, `POST_ID` are
filled in as you go:

```powershell
# 1. create campaign
curl -X POST http://localhost:4000/api/campaigns `
  -H "Content-Type: application/json" `
  -d '{\"user_id\":\"<USER_ID>\",\"campaign_name\":\"Ramadan Iftar Promo\",\"platform\":\"instagram\",\"budget\":1500,\"audience_size\":50000,\"content_type\":\"reel\",\"posting_time\":\"2026-03-12T19:00:00Z\",\"region\":\"LB\"}'

# 2. create post
curl -X POST http://localhost:4000/api/posts `
  -H "Content-Type: application/json" `
  -d '{\"campaign_id\":\"<CAMPAIGN_ID>\",\"text_content\":\"إفطار رمضاني مميّز بأطباق شرقية لذيذة. احجز طاولتك الآن!\",\"language\":\"ar\"}'

# 3. sentiment
curl -X POST http://localhost:4000/api/analyze/sentiment `
  -H "Content-Type: application/json" `
  -d '{\"postId\":\"<POST_ID>\",\"text\":\"إفطار رمضاني مميّز بأطباق شرقية لذيذة. احجز طاولتك الآن!\"}'

# 4. ROI
curl -X POST http://localhost:4000/api/predict/roi `
  -H "Content-Type: application/json" `
  -d '{\"campaignId\":\"<CAMPAIGN_ID>\",\"budget\":1500,\"platform\":\"instagram\",\"contentType\":\"reel\",\"audienceSize\":50000,\"postingHour\":19,\"sentimentScore\":0.95,\"holidayFlag\":1,\"region\":\"Lebanon\"}'
```
