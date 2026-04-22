-- ============================================================================
-- SmartMENA Analytics - Supabase / PostgreSQL schema (MVP)
-- ----------------------------------------------------------------------------
-- Safe to run multiple times (uses `IF NOT EXISTS`).
-- Designed for Supabase but works on any PostgreSQL 13+ instance.
-- ============================================================================

-- Needed by gen_random_uuid(). Supabase projects have this extension
-- available but it may not be enabled yet.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------
-- NOTE: This is a simple app-level users table for the MVP. We are NOT yet
-- integrating with Supabase Auth (auth.users). Later we can link a row here
-- to auth.users via a shared id, or drop this table entirely and rely on
-- Supabase Auth. For now, password_hash is a plain text column that the
-- backend will fill with a bcrypt/argon2 hash when auth is added.
create table if not exists public.users (
    id             uuid primary key default gen_random_uuid(),
    name           text not null,
    email          text not null unique,
    password_hash  text,
    created_at     timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

-- ---------------------------------------------------------------------------
-- 2. campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references public.users(id) on delete cascade,
    campaign_name   text not null,
    platform        text not null,   -- facebook | instagram | tiktok | google | x
    budget          numeric(12, 2) not null check (budget >= 0),
    audience_size   integer check (audience_size >= 0),
    content_type    text,            -- image | video | carousel | reel | story | text
    posting_time    timestamptz,     -- scheduled/actual posting time
    region          text,            -- LB | AE | SA | EG | JO | ...
    created_at      timestamptz not null default now()
);

create index if not exists campaigns_user_idx       on public.campaigns (user_id);
create index if not exists campaigns_created_at_idx on public.campaigns (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. posts
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
    id            uuid primary key default gen_random_uuid(),
    campaign_id   uuid not null references public.campaigns(id) on delete cascade,
    text_content  text not null,
    language      text default 'ar',
    created_at    timestamptz not null default now()
);

create index if not exists posts_campaign_idx   on public.posts (campaign_id);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- ---------------------------------------------------------------------------
-- 4. sentiment_results
-- ---------------------------------------------------------------------------
create table if not exists public.sentiment_results (
    id           uuid primary key default gen_random_uuid(),
    post_id      uuid not null references public.posts(id) on delete cascade,
    sentiment    text not null check (sentiment in ('positive', 'negative', 'neutral')),
    confidence   numeric(5, 4) check (confidence >= 0 and confidence <= 1),
    analyzed_at  timestamptz not null default now()
);

create index if not exists sentiment_results_post_idx       on public.sentiment_results (post_id);
create index if not exists sentiment_results_analyzed_idx   on public.sentiment_results (analyzed_at desc);

-- ---------------------------------------------------------------------------
-- 5. predictions
-- ---------------------------------------------------------------------------
create table if not exists public.predictions (
    id                     uuid primary key default gen_random_uuid(),
    campaign_id            uuid not null references public.campaigns(id) on delete cascade,
    predicted_roi          numeric(10, 4),
    predicted_engagement   numeric(10, 4),
    confidence_score       numeric(5, 4) check (confidence_score >= 0 and confidence_score <= 1),
    created_at             timestamptz not null default now()
);

create index if not exists predictions_campaign_idx   on public.predictions (campaign_id);
create index if not exists predictions_created_at_idx on public.predictions (created_at desc);

-- ============================================================================
-- Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- We are deliberately NOT enabling RLS here. The backend connects with the
-- service_role key, which bypasses RLS. When a frontend starts using the
-- anon/publishable key, enable RLS on each table and add per-user policies.
--
-- Example (commented out for MVP):
--
-- alter table public.campaigns enable row level security;
-- create policy "users read their own campaigns" on public.campaigns
--   for select using (auth.uid() = user_id);
-- ============================================================================
