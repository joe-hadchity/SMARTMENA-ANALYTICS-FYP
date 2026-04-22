-- ============================================================================
-- schema_v7.sql -- additive, idempotent. Apply after schema_v6.sql.
--
-- Introduces:
--   * report_shares   (new) -- public, token-based "share this growth report" link
--
-- Design:
--   * Adds ONLY additive tables. Safe to re-run.
--   * RLS stays OFF for the beta (no auth yet).
--   * The public /r/:token route reads by token alone, so tokens must be
--     unguessable. We default to encode(gen_random_bytes(24), 'hex').
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.report_shares (
    id                 uuid primary key default gen_random_uuid(),
    workspace_id       uuid not null references public.workspaces(id) on delete cascade,
    token              text not null unique default encode(gen_random_bytes(24), 'hex'),
    report_type        text not null default 'growth' check (report_type in ('growth', 'competitor')),
    locale             text not null default 'en' check (locale in ('en', 'ar')),
    data_snapshot_json jsonb not null default '{}'::jsonb,
    expires_at         timestamptz,
    revoked            boolean not null default false,
    created_at         timestamptz not null default now()
);

create index if not exists report_shares_workspace_idx
    on public.report_shares (workspace_id);

create index if not exists report_shares_token_idx
    on public.report_shares (token);

create index if not exists report_shares_created_at_idx
    on public.report_shares (created_at desc);
