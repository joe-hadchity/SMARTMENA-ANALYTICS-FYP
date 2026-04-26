# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartMENA Analytics is an AI-powered marketing analytics platform for SMEs in the MENA region. Three services communicate over HTTP with a shared Supabase (PostgreSQL) database:

| Service | Tech | Port |
|---------|------|------|
| Backend | Node.js 20 + Express | 4000 |
| ML service | Python 3.11 + FastAPI | 8000 |
| Frontend | Next.js 14 (App Router) | 3000 |

## Development Commands

### Backend (Express)
```bash
cd backend
npm install
npm run dev        # nodemon hot-reload
npm start          # plain node
```

### ML Service (FastAPI)
```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate      # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/generate_dataset.py   # generate synthetic training data
python -m app.train_roi               # train and save roi_model.joblib
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev        # port 3000
npm run build
npm run lint
```

### Health checks
```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/docs      # Swagger UI
curl http://localhost:8000/health        # includes roi_model_loaded flag
```

## Architecture

### Backend (`backend/src/`)

MVC structure with a provider registry pattern for social platforms.

- `config/` — env.js (dotenv loader), supabase.js (lazy singleton client), swagger.js
- `routes/` — 22 modules, all mounted under `/api`
- `controllers/` — thin HTTP handlers
- `services/` — business logic (~28 modules):
  - `mlClient.js` — axios wrapper to FastAPI
  - `llm/` — Azure OpenAI integration with monthly token budgeting
  - `oauth/` — Meta Graph API, token encryption
  - `providers/` — pluggable social platform adapters (meta_instagram, meta_facebook; tiktok/x are stubs)
  - Background workers: `publishWorker` (60s), `digestWorker` (24h), `trendWorker` (6h) — started at server init; disable with `SMARTMENA_DISABLE_WORKERS=1`
- `middleware/` — errorHandler, notFound, validate (Zod), workspaceContext (tenant scoping via `x-workspace-id` header)
- `validators/` — Zod schemas
- `db/schema.sql` (v1) and `db/schema_v2.sql` (v2, additive)

**Multi-tenancy**: workspace_id is the tenancy boundary passed as `x-workspace-id` header. RLS is disabled in beta. The frontend auto-creates a `demo` workspace on first request if none exists.

**Provider contract**: social adapters must implement `beginOAuth`, `completeOAuth`, `fetchAccountInfo`, `listPosts`, `fetchPostMetrics` with normalized return shapes. New providers are drop-in additions to the registry.

**LLM layer**: Azure OpenAI is optional — the app stays functional without credentials; LLM endpoints return empty/fallback responses.

### ML Service (`ml-service/app/`)

Stateless service; no database access. Called only by the backend.

- `main.py` — 3 endpoints: `GET /health`, `POST /predict-sentiment`, `POST /predict-roi`
- `sentiment.py` — Arabic sentiment via CAMeL-Lab CAMeLBERT (Hugging Face); lazy-loaded with `@lru_cache`; first request downloads ~500 MB (10–30s cold start)
- `roi_model.py` — loads `models/roi_model.joblib`; falls back to a heuristic if file missing
- `preprocess.py` — Arabic text normalization (NFKC, diacritic strip, alef folding, etc.) + ROI feature engineering
- `train_roi.py` — trains `MultiOutputRegressor(GradientBoostingRegressor)` predicting `engagement_rate` + `roi` jointly (holdout R² ≈ 0.84 / 0.73 on synthetic data)

### Frontend (`frontend/src/`)

Next.js 14 App Router. Active build — ignore `frontend-beta/` (React+Vite reference) and `frontend-demo/` (temp demo).

Key pages under `src/app/`:
- `/` Dashboard, `/campaigns`, `/posts`, `/insights`, `/recommendations`, `/reports`, `/trends`, `/competitors`, `/compose`, `/calendar`, `/connections`, `/settings`

Key patterns:
- `x-workspace-id` header injected from `localStorage.smartmena.workspaceId` or `NEXT_PUBLIC_WORKSPACE_ID`
- TanStack Query v5 for server state + mutations
- React Hook Form + Zod for client-side validation
- Custom i18n in `src/i18n/` — AR (RTL, IBM Plex Sans Arabic) ↔ EN (LTR) toggle persisted in localStorage
- `src/components/ui/` — Radix UI primitives + Tailwind

### Database

Two additive schema versions in `backend/db/`:
- **v1** (`schema.sql`): users, campaigns, posts, sentiment_results, predictions
- **v2** (`schema_v2.sql`): workspaces, social_accounts, synced_posts, post_metrics, ai_insights

All PKs use `gen_random_uuid()`. Backend uses the **service role key only** (no anon key). RLS disabled in beta.

## Environment Variables

**Backend** (`backend/.env.example`):
```
PORT=4000
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8000
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...       # service role, NOT anon key
AZURE_OPENAI_ENDPOINT=...           # optional
AZURE_OPENAI_API_KEY=...            # optional
AZURE_OPENAI_DEPLOYMENT=...         # optional
META_APP_ID=...                     # optional, Phase 5
META_APP_SECRET=...                 # optional
TOKEN_ENCRYPTION_KEY=...            # optional, for OAuth token encryption
FRONTEND_URL=http://localhost:3000
LLM_MONTHLY_TOKEN_BUDGET=100000
```

**Frontend** (`frontend/.env.example`):
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_WORKSPACE_ID=           # optional, pins a workspace
```

## Key Conventions

- **Casing**: camelCase in external API and JS code; snake_case in DB columns and internally within services
- **Error handling**: `asyncHandler` wrapper in `backend/src/utils/` for controller functions; Zod `validate` middleware at route level
- **Synthetic data only**: ROI model is trained on deterministically generated synthetic data (`scripts/generate_dataset.py`, seed=42)
- **No tests**: no test suite is configured in any service
