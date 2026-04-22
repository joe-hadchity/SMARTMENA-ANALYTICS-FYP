-- ============================================================================
-- SmartMENA Analytics - Supabase / PostgreSQL schema v2 (BETA)
-- ----------------------------------------------------------------------------
-- Additive migration on top of `schema.sql`. Safe to run multiple times.
-- Does NOT drop, rename, or alter the columns of any table created by v1.
-- ----------------------------------------------------------------------------
-- Adds:
--   * workspaces                (tenant boundary)
--   * social_accounts           (connected social accounts, Meta-first)
--   * synced_posts              (posts fetched from a connected account)
--   * post_metrics              (append-only time-series of engagement data)
--   * ai_insights               (cross-source, bilingual AI-generated insights)
-- Extends (additive columns only, nullable):
--   * campaigns.workspace_id    (FK -> workspaces.id)
--   * posts.workspace_id        (FK -> workspaces.id)
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. workspaces
-- ---------------------------------------------------------------------------
-- The tenant boundary for the beta. No auth yet, so the backend resolves the
-- active workspace from an x-workspace-id header and auto-creates a row with
-- slug='demo' when none exists.
create table if not exists public.workspaces (
    id                uuid primary key default gen_random_uuid(),
    name              text not null,
    slug              text not null unique,
    region_default    text,                                 -- LB | AE | SA | EG | JO
    locale_default    text not null default 'ar'
                      check (locale_default in ('ar', 'en')),
    owner_user_id     uuid references public.users(id) on delete set null,
    created_at        timestamptz not null default now()
);

create index if not exists workspaces_slug_idx       on public.workspaces (slug);
create index if not exists workspaces_created_at_idx on public.workspaces (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. backfill workspace_id on v1 tables (nullable so legacy rows survive)
-- ---------------------------------------------------------------------------
alter table public.campaigns
    add column if not exists workspace_id uuid
    references public.workspaces(id) on delete cascade;

alter table public.posts
    add column if not exists workspace_id uuid
    references public.workspaces(id) on delete cascade;

create index if not exists campaigns_workspace_idx on public.campaigns (workspace_id);
create index if not exists posts_workspace_idx     on public.posts     (workspace_id);

-- ---------------------------------------------------------------------------
-- 3. social_accounts
-- ---------------------------------------------------------------------------
-- Connected social accounts. Mock-first: `is_mock=true` means the row was
-- created by a mock provider (no real OAuth, no Graph API calls). When real
-- Meta OAuth lands, existing rows keep working; new ones flip `is_mock=false`
-- and fill `access_token_ciphertext` + `token_expires_at`.
create table if not exists public.social_accounts (
    id                       uuid primary key default gen_random_uuid(),
    workspace_id             uuid not null references public.workspaces(id) on delete cascade,
    provider                 text not null
                             check (provider in (
                                 'meta_instagram',
                                 'meta_facebook',
                                 'tiktok',
                                 'x'
                             )),
    external_account_id      text not null,     -- id on the provider side
    handle                   text,              -- e.g. @brand
    display_name             text,
    avatar_url               text,
    profile_url              text,
    status                   text not null default 'connected'
                             check (status in ('connected', 'disconnected', 'error')),
    access_token_ciphertext  text,              -- nullable while mock-mode
    token_expires_at         timestamptz,
    is_mock                  boolean not null default true,
    connected_at             timestamptz not null default now(),
    last_synced_at           timestamptz,
    metadata                 jsonb not null default '{}'::jsonb,
    unique (workspace_id, provider, external_account_id)
);

create index if not exists social_accounts_workspace_idx on public.social_accounts (workspace_id);
create index if not exists social_accounts_provider_idx  on public.social_accounts (provider);
create index if not exists social_accounts_status_idx    on public.social_accounts (status);

-- ---------------------------------------------------------------------------
-- 4. synced_posts
-- ---------------------------------------------------------------------------
-- Posts fetched from a connected social_account (by a real or mock provider).
-- Different from `posts` (v1): v1 `posts` are user-drafted campaign copy; these
-- are posts already published on the platform.
create table if not exists public.synced_posts (
    id                 uuid primary key default gen_random_uuid(),
    workspace_id       uuid not null references public.workspaces(id) on delete cascade,
    social_account_id  uuid not null references public.social_accounts(id) on delete cascade,
    external_post_id   text not null,
    post_type          text check (post_type in (
                           'image', 'video', 'carousel', 'reel', 'story', 'text'
                       )),
    caption            text,
    caption_lang       text check (caption_lang in ('ar', 'en', 'mixed')),
    media_url          text,
    permalink          text,
    posted_at          timestamptz,
    fetched_at         timestamptz not null default now(),
    raw_payload        jsonb not null default '{}'::jsonb,
    unique (social_account_id, external_post_id)
);

create index if not exists synced_posts_workspace_idx on public.synced_posts (workspace_id);
create index if not exists synced_posts_account_idx   on public.synced_posts (social_account_id);
create index if not exists synced_posts_posted_idx    on public.synced_posts (posted_at desc);
create index if not exists synced_posts_lang_idx      on public.synced_posts (caption_lang);

-- ---------------------------------------------------------------------------
-- 5. post_metrics (append-only time-series)
-- ---------------------------------------------------------------------------
create table if not exists public.post_metrics (
    id                uuid primary key default gen_random_uuid(),
    synced_post_id    uuid not null references public.synced_posts(id) on delete cascade,
    captured_at       timestamptz not null default now(),
    likes             integer not null default 0 check (likes >= 0),
    comments          integer not null default 0 check (comments >= 0),
    shares            integer not null default 0 check (shares >= 0),
    saves             integer not null default 0 check (saves >= 0),
    impressions       integer not null default 0 check (impressions >= 0),
    reach             integer not null default 0 check (reach >= 0),
    video_views       integer not null default 0 check (video_views >= 0),
    engagement_rate   numeric(6, 5) check (engagement_rate >= 0 and engagement_rate <= 1)
);

create index if not exists post_metrics_post_idx      on public.post_metrics (synced_post_id);
create index if not exists post_metrics_captured_idx  on public.post_metrics (captured_at desc);

-- ---------------------------------------------------------------------------
-- 6. ai_insights (bilingual, cross-source)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_insights (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    scope_type      text not null
                    check (scope_type in (
                        'workspace', 'campaign', 'social_account', 'synced_post'
                    )),
    scope_id        uuid,
    insight_type    text not null
                    check (insight_type in (
                        'sentiment_summary',
                        'performance_anomaly',
                        'content_recommendation',
                        'best_posting_time',
                        'mena_trend'
                    )),
    title_ar        text,
    title_en        text,
    body_ar         text,
    body_en         text,
    severity        text not null default 'info'
                    check (severity in ('info', 'warning', 'opportunity')),
    confidence      numeric(5, 4) check (confidence >= 0 and confidence <= 1),
    data            jsonb not null default '{}'::jsonb,
    model_version   text,
    generated_at    timestamptz not null default now()
);

create index if not exists ai_insights_workspace_idx on public.ai_insights (workspace_id);
create index if not exists ai_insights_scope_idx     on public.ai_insights (scope_type, scope_id);
create index if not exists ai_insights_type_idx      on public.ai_insights (insight_type);
create index if not exists ai_insights_generated_idx on public.ai_insights (generated_at desc);
create index if not exists ai_insights_severity_idx  on public.ai_insights (severity);

-- ============================================================================
-- Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- RLS stays OFF for the beta, matching schema.sql. When auth lands, the first
-- step is to enable RLS on every table created here and add per-workspace
-- policies keyed on `workspace_id = auth.jwt() -> 'workspace_id'`.
-- ============================================================================
