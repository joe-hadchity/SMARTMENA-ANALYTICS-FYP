-- ============================================================================
-- schema_v16.sql -- additive, idempotent. Apply after schema_v15.sql.
--
-- Hashtag trend tracking MVP.
--
-- Tracks Instagram hashtags through a swappable provider adapter. The current
-- provider is Apify hashtag scraping; a future Meta hashtag adapter can write
-- the same snapshot shape.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.tracked_hashtags (
    id             uuid primary key default gen_random_uuid(),
    workspace_id   uuid not null references public.workspaces(id) on delete cascade,
    platform       text not null default 'instagram',
    tag            text not null,
    display_name   text,
    source         text not null default 'apify',
    status         text not null default 'active'
                   check (status in ('active', 'paused')),
    last_synced_at timestamptz,
    metadata_json  jsonb not null default '{}'::jsonb,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    constraint tracked_hashtags_unique_tag unique (workspace_id, platform, tag)
);

create index if not exists tracked_hashtags_workspace_idx
    on public.tracked_hashtags (workspace_id, status, created_at desc);

create table if not exists public.hashtag_snapshots (
    id                    uuid primary key default gen_random_uuid(),
    tracked_hashtag_id    uuid not null references public.tracked_hashtags(id) on delete cascade,
    workspace_id          uuid not null references public.workspaces(id) on delete cascade,
    provider              text not null default 'apify',
    source_url            text,
    captured_at           timestamptz not null default now(),
    sample_size           integer not null default 0 check (sample_size >= 0),
    media_count           integer,
    total_likes           integer not null default 0,
    total_comments        integer not null default 0,
    total_video_views     integer not null default 0,
    total_engagement      integer not null default 0,
    avg_engagement        numeric(12, 2) not null default 0,
    momentum_score        numeric(8, 2) not null default 0,
    top_media_json        jsonb not null default '[]'::jsonb,
    raw_payload_json      jsonb not null default '{}'::jsonb,
    warnings              text[] not null default '{}',
    created_at            timestamptz not null default now()
);

create index if not exists hashtag_snapshots_hashtag_time_idx
    on public.hashtag_snapshots (tracked_hashtag_id, captured_at desc);
create index if not exists hashtag_snapshots_workspace_time_idx
    on public.hashtag_snapshots (workspace_id, captured_at desc);
create index if not exists hashtag_snapshots_momentum_idx
    on public.hashtag_snapshots (momentum_score desc);
