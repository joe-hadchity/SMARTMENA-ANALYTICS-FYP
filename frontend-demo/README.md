# frontend-demo

Temporary one-page React + Vite demo for presentation purposes. It talks to the existing backend at `http://localhost:4000/api` over HTTP only. It does not modify the backend, ML service, docs, or database.

## Run

1. Copy `.env.example` to `.env` and adjust values:

   ```
   VITE_API_BASE_URL=http://localhost:4000/api
   VITE_DEMO_USER_ID=<uuid-of-a-row-in-public.users>
   ```

   The `VITE_DEMO_USER_ID` must be the id of a row that already exists in `public.users` in Supabase. Every campaign created by this demo is written under that user. The UUID is injected automatically from env - the UI never shows or asks for it.

2. Install and start:

   ```
   npm install
   npm run dev
   ```

3. Make sure the backend is running on `http://localhost:4000` (see `../backend`).

## Flow

The page has four chained sections:

1. Create Campaign
2. Create Post (uses the new campaign's id)
3. Analyze Sentiment (uses the new post's id + text)
4. Predict ROI (prefilled from campaign + sentiment result)

## Delete

To remove the demo, delete the `frontend-demo/` folder. Nothing else in the repo depends on it.
