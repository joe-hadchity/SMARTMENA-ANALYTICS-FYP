# SmartMENA Analytics — Frontend (beta)

A Next.js 14 (App Router) + TypeScript + Tailwind SaaS dashboard for the
SmartMENA backend. Built from scratch alongside the beta product; the older
`frontend-demo` and `frontend-beta` folders remain as supervisor references
until this app is considered canonical.

## Stack

- **Next.js 14** (App Router, React 18)
- **TypeScript**
- **Tailwind CSS** (+ a small custom design system under `src/components/ui`)
- **TanStack Query** for data fetching and mutations
- **React Hook Form + Zod** for forms
- **Recharts** for dashboard charts
- **lucide-react** icons
- Custom light-weight i18n (`src/i18n`) with Arabic (RTL) + English (LTR)

## Pages

| Path              | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `/`               | Overview dashboard (KPIs + charts + insights feed)  |
| `/connections`    | Connect (mock) Meta accounts + per-account sync     |
| `/posts`          | Synced posts feed with language/type/account filter |
| `/campaigns`      | Campaign list                                       |
| `/campaigns/new`  | Campaign creation form                              |
| `/campaigns/:id`  | Campaign detail + predictions + drafted posts       |
| `/insights`       | AI insights feed (filterable, generate on demand)   |
| `/recommendations`| MENA recommendations form + result card             |
| `/settings`       | Workspace name/slug/region/locale + switcher        |

## Getting started

```bash
# from the repo root
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The dashboard expects the Express backend at `NEXT_PUBLIC_API_BASE_URL`
(default `http://localhost:4000/api`). Run the backend + ml-service as
described in the project root README first.

### Workspace header

Every request sends an `x-workspace-id` header if one is stored in
localStorage under `smartmena.workspaceId` (or set via the
`NEXT_PUBLIC_WORKSPACE_ID` env var). If absent, the backend auto-resolves a
`demo` workspace on its side, so the app works out of the box with no setup.

Use **Settings → Switch workspace** to change the active workspace once you
have more than one.

## Language & direction

Toggle Arabic ⟷ English from the topbar. The toggle sets
`document.documentElement.dir` and the locale persists in localStorage.
Arabic renders with an Arabic-first font stack (IBM Plex Sans Arabic → Noto
Sans Arabic → Tajawal); the English stack is Inter → system-ui.
