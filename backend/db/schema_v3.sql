-- ============================================================================
-- SmartMENA Analytics - Supabase / PostgreSQL schema v3 (BETA, phase 2)
-- ----------------------------------------------------------------------------
-- Additive migration on top of `schema_v2.sql`. Safe to run multiple times.
-- Does NOT drop, rename, or change the type of any existing column.
-- ----------------------------------------------------------------------------
-- Adds:
--   * workspaces.industry           (nullable)
--   * social_accounts.account_type  (nullable)
--   * sync_jobs                     (new, tracks connector sync runs)
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. workspaces.industry
-- ---------------------------------------------------------------------------
-- Free-form industry tag for MENA-tailored recommendations (e.g. 'fnb',
-- 'retail', 'services', 'ecommerce', 'fintech'). Kept as TEXT rather than
-- a check constraint because the taxonomy is still evolving.
alter table public.workspaces
    add column if not exists industry text;

create index if not exists workspaces_industry_idx
    on public.workspaces (industry);

-- ---------------------------------------------------------------------------
-- 2. social_accounts.account_type
-- ---------------------------------------------------------------------------
-- Platform-side account classification (e.g. 'business', 'creator',
-- 'personal', 'page'). Nullable because not every provider exposes it and
-- because existing mock rows were created before this column existed.
alter table public.social_accounts
    add column if not exists account_type text;

create index if not exists social_accounts_account_type_idx
    on public.social_accounts (account_type);

-- ---------------------------------------------------------------------------
-- 3. sync_jobs
-- ---------------------------------------------------------------------------
-- Durable record of every connector sync attempt (real or mock). Lets the
-- product show "last sync status", failure reasons, and audit history
-- per workspace / per account. Inline sync (see syncService) writes a row
-- before calling the provider and updates status on completion/failure.
create table if not exists public.sync_jobs (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    platform        text not null
                    check (platform in (
                        'meta_instagram',
                        'meta_facebook',
                        'tiktok',
                        'x'
                    )),
    account_id      uuid references public.social_accounts(id) on delete cascade,
    job_type        text not null
                    check (job_type in (
                        'posts_sync',
                        'metrics_sync',
                        'account_refresh',
                        'full_sync'
                    )),
    status          text not null default 'pending'
                    check (status in (
                        'pending',
                        'running',
                        'completed',
                        'failed',
                        'cancelled'
                    )),
    started_at      timestamptz,
    completed_at    timestamptz,
    error_message   text,
    created_at      timestamptz not null default now()
);

create index if not exists sync_jobs_workspace_idx  on public.sync_jobs (workspace_id);
create index if not exists sync_jobs_account_idx    on public.sync_jobs (account_id);
create index if not exists sync_jobs_platform_idx   on public.sync_jobs (platform);
create index if not exists sync_jobs_status_idx     on public.sync_jobs (status);
create index if not exists sync_jobs_created_at_idx on public.sync_jobs (created_at desc);

-- ============================================================================
-- Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- RLS stays OFF for the beta, matching schema.sql and schema_v2.sql. When
-- auth lands, enable RLS on sync_jobs and add a per-workspace policy keyed
-- on `workspace_id = auth.jwt() -> 'workspace_id'`, mirroring the other
-- workspace-scoped tables.
-- ============================================================================
