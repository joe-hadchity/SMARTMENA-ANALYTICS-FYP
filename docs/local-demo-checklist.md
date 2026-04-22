# Local demo checklist

Short, reliable command list for a live demo. Assumes one-time setup
(`npm install`, `pip install -r requirements.txt`, schema loaded,
`roi_model.joblib` trained) is already done. For the full guided
narration use `docs/demo-script.md`.

Placeholders you will fill in as you go:

- `<USER_ID>` — UUID of the seeded demo user (one-time SQL insert)
- `<CAMPAIGN_ID>` — returned by step 6
- `<POST_ID>` — returned by step 7

---

## 1. Start the backend

Terminal 1:

```powershell
cd backend
npm run dev
```

Wait for: `SmartMENA backend listening on http://localhost:4000`.

## 2. Start the ML service

Terminal 2:

```powershell
cd ml-service
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Wait for: `Uvicorn running on http://127.0.0.1:8000`.

Warm up the Arabic model (first call only, ~10–30 s) so the live demo is instant:

```powershell
curl -X POST http://localhost:8000/predict-sentiment `
  -H "Content-Type: application/json" `
  -d '{\"text\":\"المنتج ممتاز\"}'
```

## 3. Verify `/api/health` (backend)

```powershell
curl http://localhost:4000/api/health
```

Expect `200` with `{ "status": "ok", ... }`.

## 4. Verify `/health` (ML service)

```powershell
curl http://localhost:8000/health
```

Expect `{ "status": "ok", "service": "smartmena-ml", "roi_model_loaded": true }`.
If `roi_model_loaded` is `false`, run `python -m app.train_roi` once from
`ml-service/` and restart uvicorn.

## 5. Open Swagger UI

```powershell
start http://localhost:4000/api/docs
```

## 6. Create a campaign

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

Expect `201`. **Copy `id` → `<CAMPAIGN_ID>`**.

## 7. Create a post

```powershell
curl -X POST http://localhost:4000/api/posts `
  -H "Content-Type: application/json" `
  -d '{
    \"campaign_id\": \"<CAMPAIGN_ID>\",
    \"text_content\": \"إفطار رمضاني مميّز بأطباق شرقية لذيذة. احجز طاولتك الآن!\",
    \"language\": \"ar\"
  }'
```

Expect `201`. **Copy `id` → `<POST_ID>`**.

## 8. Analyze sentiment

```powershell
curl -X POST http://localhost:4000/api/analyze/sentiment `
  -H "Content-Type: application/json" `
  -d '{
    \"postId\": \"<POST_ID>\",
    \"text\": \"إفطار رمضاني مميّز بأطباق شرقية لذيذة. احجز طاولتك الآن!\"
  }'
```

Expect `200` with `{ postId, sentiment: "positive", confidence: ~0.97 }`.

## 9. Predict ROI

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

Expect `200` with `{ campaignId, predictedRoi, predictedEngagement, confidenceScore }`.

## 10. Confirm rows in Supabase

Open Supabase Dashboard → **Table Editor** and refresh each table:

| Table | Should contain |
|---|---|
| `campaigns` | 1 new row — the campaign from step 6 |
| `posts` | 1 new row — the post from step 7, `campaign_id` matches step 6 |
| `sentiment_results` | 1 new row — `post_id` matches step 7, `sentiment = 'positive'` |
| `predictions` | 1 new row — `campaign_id` matches step 6, numeric `predicted_roi` / `predicted_engagement` / `confidence_score` |

Or run in the SQL Editor:

```sql
select 'campaigns'         as tbl, count(*) from public.campaigns
union all select 'posts',               count(*) from public.posts
union all select 'sentiment_results',   count(*) from public.sentiment_results
union all select 'predictions',         count(*) from public.predictions;
```

---

## Quick recovery

| Symptom | Fix |
|---|---|
| `503 ML service unreachable` | uvicorn died; restart terminal 2 |
| `503 Supabase is not configured` | `backend/.env` missing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`; fix and restart backend |
| First sentiment call times out | You skipped the warm-up in step 2; rerun it |
| `400 Invalid foreign key reference` on campaign create | `user_id` doesn't exist; re-seed the demo user in Supabase |
| `400` on post create | `<CAMPAIGN_ID>` not pasted correctly |
| ROI `confidenceScore` stuck at 0.4 | `roi_model.joblib` missing — run `python -m app.train_roi` and restart uvicorn |
