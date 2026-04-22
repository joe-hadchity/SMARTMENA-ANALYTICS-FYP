# frontend-beta

SmartMENA Analytics beta frontend. React + Vite (JavaScript). Talks to the backend at `/api` over HTTP only.

## Stack

- React 18 + Vite 5
- React Router 6 (sidebar dashboard with multi-route navigation)
- React Hook Form 7 + Zod 3 (forms and validation)
- Axios 1 (HTTP)
- Plain CSS + CSS Modules

## Run

1. Copy `.env.example` to `.env` and fill in real values:

   ```
   VITE_API_BASE_URL=http://localhost:4000/api
   VITE_DEMO_USER_ID=<uuid-of-an-existing-row-in-public.users>
   ```

   The demo user must already exist in Supabase `public.users`. The beta injects this UUID into every campaign create request and never exposes it in the UI.

2. Install and start:

   ```
   npm install
   npm run dev
   ```

3. The backend must be running on the configured base URL (default `http://localhost:4000`). Start it from `../backend` (`npm run dev`), and `../ml-service` for sentiment + ROI.

## Layout

- **Dashboard** - stat tiles and recent campaigns.
- **Campaigns** - list of campaigns, create new, drill into a campaign to add posts.
- **Sentiment** - analyze any post (existing or manually entered id + text).
- **ROI** - predict ROI for any campaign (existing or manual).

Persisted data (campaigns, posts, sentiment results, ROI predictions) is kept in `localStorage` under the key `smartmena.beta.v1`. The backend currently has no GET endpoints for listing, so this is a client-side stopgap.

## Removability

This folder is isolated. To remove the beta, delete `frontend-beta/`.
