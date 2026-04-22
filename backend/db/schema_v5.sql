-- ============================================================================
-- SmartMENA Analytics - Supabase / PostgreSQL schema v5 (BETA, phase 4)
-- ----------------------------------------------------------------------------
-- Additive migration on top of `schema_v4.sql`. Safe to run multiple times.
-- Does NOT drop, rename, or change the type of any existing column.
-- ----------------------------------------------------------------------------
-- Introduces the explicit AI layer:
--   * ai_insights  -- adds plain `title`, `summary`, `source`, `created_at`
--                     columns beside the existing bilingual ones so the
--                     simpler startup-friendly shape can be consumed
--                     directly by the frontend and by future LLM producers.
--   * recommendations   (new)
--   * content_scores    (new) -- persists POST /api/content/score results
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. ai_insights  -- additive columns only
-- ---------------------------------------------------------------------------
-- The v2 table already carries (title_ar, title_en, body_ar, body_en,
-- severity, confidence, data, model_version, generated_at). We add a
-- flat, single-language projection alongside so the /api/workspaces/:id/
-- insights endpoint (and any LLM-based producer we add later) can read
-- and write the startup-friendly shape without touching the bilingual
-- fields.
alter table public.ai_insights
    add column if not exists title       text,
    add column if not exists summary     text,
    add column if not exists source      text,
    add column if not exists created_at  timestamptz not null default now();

create index if not exists ai_insights_created_at_idx
    on public.ai_insights (created_at desc);
create index if not exists ai_insights_source_idx
    on public.ai_insights (source);

-- ---------------------------------------------------------------------------
-- 2. recommendations  (new)
-- ---------------------------------------------------------------------------
-- Durable, human-readable recommendations attached to a workspace. The
-- MENA recommendations endpoint stays stateless (/api/recommendations/mena)
-- -- this table is for recommendations we want to persist, show on the
-- dashboard, and mark as acted-on later.
create table if not exists public.recommendations (
    id                  uuid primary key default gen_random_uuid(),
    workspace_id        uuid not null references public.workspaces(id) on delete cascade,
    recommendation_type text not null check (recommendation_type in (
                            'content',
                            'posting_time',
                            'mena_event',
                            'audience',
                            'budget',
                            'other'
                        )),
    title               text not null,
    description         text,
    priority            text not null default 'medium' check (priority in (
                            'low', 'medium', 'high'
                        )),
    data                jsonb not null default '{}'::jsonb,
    created_at          timestamptz not null default now()
);

create index if not exists recommendations_workspace_idx
    on public.recommendations (workspace_id);
create index if not exists recommendations_type_idx
    on public.recommendations (recommendation_type);
create index if not exists recommendations_priority_idx
    on public.recommendations (priority);
create index if not exists recommendations_created_at_idx
    on public.recommendations (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. content_scores  (new)
-- ---------------------------------------------------------------------------
-- Persists every POST /api/content/score call so the AI layer is
-- explainable (you can always show the user "what did the model say?"),
-- auditable, and queryable for retraining signals later.
create table if not exists public.content_scores (
    id                   uuid primary key default gen_random_uuid(),
    workspace_id         uuid not null references public.workspaces(id) on delete cascade,
    platform             text not null check (platform in (
                             'meta_instagram',
                             'meta_facebook',
                             'instagram',
                             'facebook',
                             'tiktok',
                             'x',
                             'twitter'
                         )),
    caption_text         text not null,
    predicted_sentiment  text check (predicted_sentiment in (
                             'positive', 'neutral', 'negative'
                         )),
    predicted_roi        numeric(10, 4),
    confidence_score     numeric(5, 4) check (
                             confidence_score is null
                             or (confidence_score >= 0 and confidence_score <= 1)
                         ),
    recommendation_text  text,
    data                 jsonb not null default '{}'::jsonb,
    created_at           timestamptz not null default now()
);

create index if not exists content_scores_workspace_idx
    on public.content_scores (workspace_id);
create index if not exists content_scores_platform_idx
    on public.content_scores (platform);
create index if not exists content_scores_created_at_idx
    on public.content_scores (created_at desc);

-- ============================================================================
-- Row-Level Security (RLS) stays OFF for the beta, consistent with earlier
-- schema files. When auth lands, enable RLS and add per-workspace policies.
-- ============================================================================
