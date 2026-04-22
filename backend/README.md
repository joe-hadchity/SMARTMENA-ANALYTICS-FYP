# SmartMENA Backend

Node.js + Express MVC backend for SmartMENA Analytics. Routes, controllers, and service stubs are in place. Persistence is wired to **Supabase** (via `@supabase/supabase-js`); if `SUPABASE_URL`/`SUPABASE_KEY` are missing the services fall back to an in-memory echo so the endpoints stay demoable.

## Folder structure

```
backend/
├── src/
│   ├── config/          # env loader + supabase client
│   ├── controllers/     # HTTP handlers
│   ├── routes/          # route wiring (mounted under /api)
│   ├── services/        # business logic / external calls
│   ├── middleware/      # errorHandler, notFound
│   ├── utils/           # logger, asyncHandler
│   ├── app.js           # Express app (middleware + routes)
│   └── server.js        # bootstrap (reads PORT and listens)
├── .env.example
└── package.json
```

## Setup

```bash
cd backend
cp .env.example .env
npm install
```

## Run

```bash
npm run dev        # nodemon, hot reload
npm start          # plain node
```

Server starts on `http://localhost:4000`.

## Endpoints (MVP)

| Method | Path                       | Status         |
| ------ | -------------------------- | -------------- |
| GET    | `/api/health`              | working         |
| POST   | `/api/campaigns`           | placeholder     |
| POST   | `/api/posts`               | placeholder     |
| POST   | `/api/analyze/sentiment`   | placeholder (will call ML service) |
| POST   | `/api/predict/roi`         | placeholder (will call ML service) |

## Quick smoke test

```bash
curl http://localhost:4000/api/health
curl -X POST http://localhost:4000/api/campaigns -H "Content-Type: application/json" -d "{\"name\":\"Test\"}"
curl -X POST http://localhost:4000/api/analyze/sentiment -H "Content-Type: application/json" -d "{\"text\":\"hello\"}"
curl -X POST http://localhost:4000/api/predict/roi -H "Content-Type: application/json" -d "{\"budgetUsd\":2500}"
```

## Environment

| Variable         | Default                   | Purpose                                         |
| ---------------- | ------------------------- | ----------------------------------------------- |
| `PORT`           | `4000`                    | HTTP port                                       |
| `NODE_ENV`       | `development`             | Log format + future behavior                    |
| `ML_SERVICE_URL` | `http://localhost:8000`   | FastAPI ML service base URL                     |
| `CORS_ORIGIN`    | `*`                       | CORS origin for the future frontend             |
| `SUPABASE_URL`   | (empty)                   | Supabase project URL                            |
| `SUPABASE_KEY`   | (empty)                   | Supabase publishable/anon key                   |

## Supabase

Tables expected by the services: `campaigns`, `posts` (and `predictions` once sentiment/ROI calls are persisted). See [../docs/architecture.md](../docs/architecture.md) for the SQL to create them.
