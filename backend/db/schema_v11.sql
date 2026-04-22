-- ============================================================================
-- schema_v11.sql -- additive, idempotent. Apply after schema_v10.sql.
--
-- Phase 7 Layer 1 -- Trend discovery.
--
-- Introduces:
--   * trend_terms       (new) -- normalized catalog of hashtags / topics /
--                                formats / sounds we have ever seen in a
--                                workspace. One row per (workspace, kind,
--                                value).
--   * trend_snapshots   (new) -- daily rollup of how each term performed
--                                (post_count, engagement, unique authors,
--                                platform + source breakdown, sample posts).
--
-- Plus a helper view `v_trend_window_base` that makes windowed aggregations
-- cheap on the read path.
--
-- Design notes:
--   * Additive only. Safe to re-run. Re-aggregation is idempotent because
--     `trend_snapshots.unique (trend_term_id, day)` lets us upsert per-day.
--   * Sources are identified as either `own` (the workspace's social_posts)
--     or `competitor` (competitor_posts). The source_breakdown JSON on each
--     snapshot preserves that split for UI filtering.
--   * Kinds supported in Layer 1:
--       - hashtag  -> extracted from caption text (unicode-aware)
--       - topic    -> LLM / rule-labelled semantic bucket
--       - format   -> normalized media_type (reel / carousel / image / video)
--       - sound    -> audio_id from platform payload; mocked otherwise
--   * RLS stays OFF for the beta (matches earlier schema files).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- trend_terms
-- ---------------------------------------------------------------------------

create table if not exists public.trend_terms (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    kind            text not null
                    check (kind in ('hashtag', 'topic', 'format', 'sound')),
    value           text not null,              -- normalized: lowercased hashtag, snake_case topic, etc.
    display_label   text,                       -- pretty form for UI (e.g. "#Ramadan" or "Food Review")
    metadata        jsonb not null default '{}'::jsonb,
    first_seen_at   timestamptz not null default now(),
    last_seen_at    timestamptz not null default now(),
    unique (workspace_id, kind, value)
);

create index if not exists trend_terms_workspace_idx
    on public.trend_terms (workspace_id);
create index if not exists trend_terms_ws_kind_idx
    on public.trend_terms (workspace_id, kind);
create index if not exists trend_terms_last_seen_idx
    on public.trend_terms (last_seen_at desc);

-- ---------------------------------------------------------------------------
-- trend_snapshots (one row per (term, day))
-- ---------------------------------------------------------------------------

create table if not exists public.trend_snapshots (
    id                  uuid primary key default gen_random_uuid(),
    trend_term_id       uuid not null references public.trend_terms(id) on delete cascade,
    workspace_id        uuid not null references public.workspaces(id) on delete cascade,
    day                 date not null,
    post_count          integer not null default 0 check (post_count >= 0),
    engagement_sum      numeric not null default 0,
    engagement_avg      numeric not null default 0,
    unique_authors      integer not null default 0 check (unique_authors >= 0),
    platform_breakdown  jsonb not null default '{}'::jsonb,   -- { meta_instagram: 12, tiktok: 3 }
    source_breakdown    jsonb not null default '{}'::jsonb,   -- { own: 2, competitor: 13 }
    sample_post_ids     jsonb not null default '[]'::jsonb,   -- top-3 posts for drill-down
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    unique (trend_term_id, day)
);

create index if not exists trend_snapshots_ws_day_idx
    on public.trend_snapshots (workspace_id, day desc);
create index if not exists trend_snapshots_term_day_idx
    on public.trend_snapshots (trend_term_id, day desc);

-- updated_at trigger for snapshots (so we can tell when a day was re-aggregated)
create or replace function public._trend_snapshots_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trend_snapshots_touch on public.trend_snapshots;
create trigger trend_snapshots_touch
    before update on public.trend_snapshots
    for each row
    execute function public._trend_snapshots_touch();

-- ---------------------------------------------------------------------------
-- v_trend_window_base (view)
-- ---------------------------------------------------------------------------
-- A thin convenience view that joins terms to their snapshots without doing
-- the time-window filter. The read service adds the `day >= ...` filter at
-- query time so we can reuse the same view for 7d / 14d / 30d.
-- ---------------------------------------------------------------------------

create or replace view public.v_trend_window_base as
select
    t.id              as trend_term_id,
    t.workspace_id,
    t.kind,
    t.value,
    t.display_label,
    t.metadata        as term_metadata,
    s.day,
    s.post_count,
    s.engagement_sum,
    s.engagement_avg,
    s.unique_authors,
    s.platform_breakdown,
    s.source_breakdown,
    s.sample_post_ids
from public.trend_terms t
join public.trend_snapshots s on s.trend_term_id = t.id;

-- ============================================================================
-- RLS stays OFF for the beta.
-- ============================================================================
