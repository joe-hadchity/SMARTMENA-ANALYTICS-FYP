-- ============================================================================
-- schema_v10.sql -- additive, idempotent. Apply after schema_v9.sql.
--
-- Phase 6 -- Competitor tracking.
--
-- Introduces:
--   * competitor_accounts           (new) -- tracked competitor handles per workspace
--   * competitor_posts              (new) -- posts scraped from competitor accounts
--   * competitor_metrics_snapshots  (new) -- append-only time-series of engagement
--   * competitor_digest_runs        (new) -- weekly digest emissions + narrative
--
-- Design:
--   * Additive only. Safe to re-run.
--   * Works in mock-first mode: the scraper layer populates the same tables
--     whether the data comes from Meta Business Discovery, the Meta Ad
--     Library scraper, or the seeded mock generator.
--   * RLS stays OFF for the beta (no auth yet).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- competitor_accounts
-- ---------------------------------------------------------------------------

create table if not exists public.competitor_accounts (
    id                    uuid primary key default gen_random_uuid(),
    workspace_id          uuid not null references public.workspaces(id) on delete cascade,
    platform              text not null
                          check (platform in (
                              'meta_instagram',
                              'meta_facebook',
                              'tiktok',
                              'x'
                          )),
    handle                text not null,
    display_name          text,
    external_account_id   text,
    avatar_url            text,
    profile_url           text,
    region                text,           -- ISO-2 country; NULL = regional
    industry              text,
    tags                  text[] not null default '{}',
    source                text not null default 'manual'
                          check (source in (
                              'manual',
                              'ad_library',
                              'business_discovery',
                              'mock'
                          )),
    is_active             boolean not null default true,
    last_scraped_at       timestamptz,
    metadata              jsonb not null default '{}'::jsonb,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),
    unique (workspace_id, platform, handle)
);

create index if not exists competitor_accounts_workspace_idx on public.competitor_accounts (workspace_id);
create index if not exists competitor_accounts_platform_idx  on public.competitor_accounts (platform);
create index if not exists competitor_accounts_active_idx    on public.competitor_accounts (is_active);

create or replace function public._competitor_accounts_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists competitor_accounts_touch on public.competitor_accounts;
create trigger competitor_accounts_touch
    before update on public.competitor_accounts
    for each row
    execute function public._competitor_accounts_touch();

-- ---------------------------------------------------------------------------
-- competitor_posts
-- ---------------------------------------------------------------------------

create table if not exists public.competitor_posts (
    id                      uuid primary key default gen_random_uuid(),
    competitor_account_id   uuid not null references public.competitor_accounts(id) on delete cascade,
    platform_post_id        text not null,
    caption                 text,
    caption_lang            text check (caption_lang in ('ar', 'en', 'mixed')),
    media_type              text check (media_type in (
                                'image', 'video', 'carousel', 'reel', 'story', 'text'
                            )),
    permalink               text,
    posted_at               timestamptz,
    fetched_at              timestamptz not null default now(),
    hashtags                text[] not null default '{}',
    raw_payload             jsonb not null default '{}'::jsonb,
    unique (competitor_account_id, platform_post_id)
);

create index if not exists competitor_posts_account_idx  on public.competitor_posts (competitor_account_id);
create index if not exists competitor_posts_posted_idx   on public.competitor_posts (posted_at desc);
create index if not exists competitor_posts_lang_idx     on public.competitor_posts (caption_lang);

-- ---------------------------------------------------------------------------
-- competitor_metrics_snapshots (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.competitor_metrics_snapshots (
    id                    uuid primary key default gen_random_uuid(),
    competitor_post_id    uuid references public.competitor_posts(id) on delete cascade,
    competitor_account_id uuid not null references public.competitor_accounts(id) on delete cascade,
    scope                 text not null default 'post' check (scope in ('post', 'account')),
    captured_at           timestamptz not null default now(),
    followers_count       integer,
    likes                 integer,
    comments              integer,
    shares                integer,
    saves                 integer,
    impressions           integer,
    reach                 integer,
    video_views           integer,
    engagement_rate       numeric(6, 5) check (engagement_rate is null or (engagement_rate >= 0 and engagement_rate <= 1)),
    metadata              jsonb not null default '{}'::jsonb
);

create index if not exists competitor_metrics_account_idx on public.competitor_metrics_snapshots (competitor_account_id);
create index if not exists competitor_metrics_post_idx    on public.competitor_metrics_snapshots (competitor_post_id);
create index if not exists competitor_metrics_captured_idx on public.competitor_metrics_snapshots (captured_at desc);

-- ---------------------------------------------------------------------------
-- competitor_digest_runs
-- ---------------------------------------------------------------------------
-- Records a weekly digest emission. The narrative_* columns carry the
-- LLM-generated executive summary (bilingual) the user sees in /competitors
-- and the email preview.
-- ---------------------------------------------------------------------------

create table if not exists public.competitor_digest_runs (
    id                    uuid primary key default gen_random_uuid(),
    workspace_id          uuid not null references public.workspaces(id) on delete cascade,
    period_start          timestamptz not null,
    period_end            timestamptz not null,
    status                text not null default 'pending'
                          check (status in ('pending', 'running', 'succeeded', 'failed')),
    summary_json          jsonb not null default '{}'::jsonb,
    narrative_en          text,
    narrative_ar          text,
    highlights            jsonb not null default '[]'::jsonb,
    competitor_count      integer not null default 0,
    post_count            integer not null default 0,
    delivery_status       text not null default 'pending'
                          check (delivery_status in ('pending', 'skipped', 'sent', 'failed')),
    delivery_target       text,                -- email or webhook URL
    delivery_message      text,
    llm_tokens_total      integer,
    created_at            timestamptz not null default now(),
    completed_at          timestamptz
);

create index if not exists competitor_digest_runs_workspace_idx on public.competitor_digest_runs (workspace_id);
create index if not exists competitor_digest_runs_period_idx    on public.competitor_digest_runs (period_end desc);
create index if not exists competitor_digest_runs_status_idx    on public.competitor_digest_runs (status);

-- ============================================================================
-- RLS stays OFF for the beta, matching schema_v9.
-- ============================================================================
