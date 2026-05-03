-- ============================================================================
-- schema_v12.sql -- additive, idempotent. Apply after schema_v11.sql.
--
-- Trend Intelligence MVP.
--
-- Evidence-first trend detection for local and global business-category trends.
-- The tables store collected signals, derived topic clusters, grounded
-- explanations, and recommended actions. No generated trend is stored without
-- supporting evidence.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- trend_runs
-- ---------------------------------------------------------------------------
create table if not exists public.trend_runs (
    id          uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    brand_id    uuid,
    run_scope   text not null check (run_scope in ('micro', 'macro')),
    run_status  text not null default 'running'
                check (run_status in ('running', 'succeeded', 'failed')),
    created_at  timestamptz not null default now()
);

create index if not exists trend_runs_workspace_idx
    on public.trend_runs (workspace_id, created_at desc);
create index if not exists trend_runs_scope_idx
    on public.trend_runs (run_scope);

-- ---------------------------------------------------------------------------
-- trend_evidence
-- ---------------------------------------------------------------------------
create table if not exists public.trend_evidence (
    id               uuid primary key default gen_random_uuid(),
    trend_run_id     uuid not null references public.trend_runs(id) on delete cascade,
    source           text not null,
    platform         text,
    title            text,
    caption          text,
    url              text,
    author           text,
    published_at     timestamptz,
    metrics_json     jsonb not null default '{}'::jsonb,
    hashtags         text[] not null default '{}',
    media_type       text,
    location_hint    text,
    raw_payload_json jsonb not null default '{}'::jsonb,
    embedding_json   jsonb not null default '[]'::jsonb,
    created_at       timestamptz not null default now()
);

create index if not exists trend_evidence_run_idx
    on public.trend_evidence (trend_run_id);
create index if not exists trend_evidence_source_idx
    on public.trend_evidence (source);
create index if not exists trend_evidence_published_idx
    on public.trend_evidence (published_at desc);

-- ---------------------------------------------------------------------------
-- trend_topics
-- ---------------------------------------------------------------------------
create table if not exists public.trend_topics (
    id             uuid primary key default gen_random_uuid(),
    trend_run_id   uuid not null references public.trend_runs(id) on delete cascade,
    topic_name     text not null,
    topic_keywords text[] not null default '{}',
    trend_score    numeric(6, 2) not null default 0,
    scope          text not null check (scope in ('micro', 'macro')),
    evidence_count integer not null default 0 check (evidence_count >= 0),
    created_at     timestamptz not null default now()
);

create index if not exists trend_topics_run_idx
    on public.trend_topics (trend_run_id);
create index if not exists trend_topics_scope_score_idx
    on public.trend_topics (scope, trend_score desc);

-- ---------------------------------------------------------------------------
-- trend_insights
-- ---------------------------------------------------------------------------
create table if not exists public.trend_insights (
    id                        uuid primary key default gen_random_uuid(),
    trend_run_id              uuid not null references public.trend_runs(id) on delete cascade,
    insight_text              text not null,
    confidence_score          numeric(5, 4) check (confidence_score >= 0 and confidence_score <= 1),
    supporting_evidence_count integer not null default 0 check (supporting_evidence_count >= 0),
    created_at                timestamptz not null default now()
);

create index if not exists trend_insights_run_idx
    on public.trend_insights (trend_run_id);

-- ---------------------------------------------------------------------------
-- trend_recommendations
-- ---------------------------------------------------------------------------
create table if not exists public.trend_recommendations (
    id                  uuid primary key default gen_random_uuid(),
    trend_run_id        uuid not null references public.trend_runs(id) on delete cascade,
    recommendation_text text not null,
    recommendation_type text not null,
    priority_score      numeric(6, 2) not null default 0,
    created_at          timestamptz not null default now()
);

create index if not exists trend_recommendations_run_idx
    on public.trend_recommendations (trend_run_id);
create index if not exists trend_recommendations_priority_idx
    on public.trend_recommendations (priority_score desc);
