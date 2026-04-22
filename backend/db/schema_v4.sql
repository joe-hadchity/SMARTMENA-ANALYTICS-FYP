-- ============================================================================
-- SmartMENA Analytics - Supabase / PostgreSQL schema v4 (BETA, phase 3)
-- ----------------------------------------------------------------------------
-- Additive migration on top of `schema_v3.sql`. Safe to run multiple times.
-- Does NOT drop, rename, or change the type of any existing column.
-- ----------------------------------------------------------------------------
-- Adds analytics-storage tables that sit next to (not replace) the v2
-- `synced_posts` / `post_metrics` pair. These new tables use the cleaner
-- public API naming (`social_posts`, `post_metrics_snapshots`,
-- `audience_snapshots`) and the metadata-first JSON-column convention.
-- Populated by future provider adapters; no external calls yet.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. social_posts
-- ---------------------------------------------------------------------------
-- Canonical representation of a post published on an external platform.
-- Keyed by (social_account_id, platform_post_id) so the same post ingested
-- twice by two sync runs is de-duplicated.
create table if not exists public.social_posts (
    id                 uuid primary key default gen_random_uuid(),
    social_account_id  uuid not null references public.social_accounts(id) on delete cascade,
    platform_post_id   text not null,
    caption            text,
    media_type         text check (media_type in (
                           'image', 'video', 'carousel', 'reel', 'story', 'text'
                       )),
    permalink          text,
    published_at       timestamptz,
    metadata_json      jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now(),
    unique (social_account_id, platform_post_id)
);

create index if not exists social_posts_account_idx     on public.social_posts (social_account_id);
create index if not exists social_posts_published_idx   on public.social_posts (published_at desc);
create index if not exists social_posts_media_type_idx  on public.social_posts (media_type);

-- ---------------------------------------------------------------------------
-- 2. post_metrics_snapshots
-- ---------------------------------------------------------------------------
-- Append-only time-series of engagement metrics per post. One row per
-- capture; the latest row is what the dashboard shows, the full series is
-- what powers trend/anomaly insights.
create table if not exists public.post_metrics_snapshots (
    id               uuid primary key default gen_random_uuid(),
    social_post_id   uuid not null references public.social_posts(id) on delete cascade,
    snapshot_time    timestamptz not null default now(),
    impressions      integer not null default 0 check (impressions >= 0),
    reach            integer not null default 0 check (reach >= 0),
    likes            integer not null default 0 check (likes >= 0),
    comments         integer not null default 0 check (comments >= 0),
    saves            integer not null default 0 check (saves >= 0),
    shares           integer not null default 0 check (shares >= 0),
    engagement_rate  numeric(6, 5) check (engagement_rate >= 0 and engagement_rate <= 1),
    metadata_json    jsonb not null default '{}'::jsonb
);

create index if not exists post_metrics_snapshots_post_idx
    on public.post_metrics_snapshots (social_post_id);
create index if not exists post_metrics_snapshots_time_idx
    on public.post_metrics_snapshots (snapshot_time desc);
create index if not exists post_metrics_snapshots_post_time_idx
    on public.post_metrics_snapshots (social_post_id, snapshot_time desc);

-- ---------------------------------------------------------------------------
-- 3. audience_snapshots
-- ---------------------------------------------------------------------------
-- Append-only time-series of audience-level stats per connected account.
-- Used for follower growth, follower/following ratio, and profile-view
-- charts on the dashboard.
create table if not exists public.audience_snapshots (
    id                 uuid primary key default gen_random_uuid(),
    social_account_id  uuid not null references public.social_accounts(id) on delete cascade,
    snapshot_time      timestamptz not null default now(),
    followers_count    integer not null default 0 check (followers_count >= 0),
    following_count    integer not null default 0 check (following_count >= 0),
    profile_views      integer not null default 0 check (profile_views >= 0),
    metadata_json      jsonb not null default '{}'::jsonb
);

create index if not exists audience_snapshots_account_idx
    on public.audience_snapshots (social_account_id);
create index if not exists audience_snapshots_time_idx
    on public.audience_snapshots (snapshot_time desc);
create index if not exists audience_snapshots_account_time_idx
    on public.audience_snapshots (social_account_id, snapshot_time desc);

-- ============================================================================
-- Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- RLS stays OFF for the beta, matching prior schema files. When auth lands,
-- enable RLS on all three tables here and add per-workspace policies that
-- join through social_accounts.workspace_id.
-- ============================================================================
