-- ============================================================================
-- schema_v9.sql -- additive, idempotent. Apply after schema_v8.sql.
--
-- Introduces:
--   * oauth_connections  (new)   -- encrypted OAuth credentials per workspace/provider
--
-- Extends (additive columns only):
--   * social_accounts.oauth_connection_id  -- FK, nullable, links live accounts to their OAuth grant
--
-- Design:
--   * Additive only. Safe to re-run.
--   * Tokens are encrypted with AES-256-GCM on the backend using
--     TOKEN_ENCRYPTION_KEY (derived server-side) and stored as bytea.
--     The plaintext token never leaves the Node.js process.
--   * pgcrypto is still required by earlier migrations for gen_random_uuid().
--   * RLS stays OFF for the beta (no auth yet).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- oauth_connections
-- ---------------------------------------------------------------------------
-- One row per connected OAuth grant. A single grant may cover multiple social
-- accounts (e.g. Facebook login returns N Pages + Instagram Business accounts).
-- ---------------------------------------------------------------------------

create table if not exists public.oauth_connections (
    id                            uuid primary key default gen_random_uuid(),
    workspace_id                  uuid not null references public.workspaces(id) on delete cascade,
    provider                      text not null
                                  check (provider in ('meta', 'tiktok', 'x')),
    external_user_id              text,                 -- provider-side user id (e.g. Facebook user id)
    scope                         text,                 -- space-separated granted scopes
    access_token_ciphertext       bytea not null,       -- pgp_sym_encrypt output
    refresh_token_ciphertext      bytea,                -- nullable; Meta long-lived user tokens have no refresh token
    token_type                    text default 'bearer',
    expires_at                    timestamptz,
    metadata                      jsonb not null default '{}'::jsonb,
    status                        text not null default 'active'
                                  check (status in ('active', 'revoked', 'expired', 'error')),
    last_verified_at              timestamptz,
    last_error_message            text,
    created_at                    timestamptz not null default now(),
    updated_at                    timestamptz not null default now(),
    unique (workspace_id, provider, external_user_id)
);

create index if not exists oauth_connections_workspace_idx on public.oauth_connections (workspace_id);
create index if not exists oauth_connections_provider_idx  on public.oauth_connections (provider);
create index if not exists oauth_connections_status_idx    on public.oauth_connections (status);

-- updated_at trigger (re-used pattern from schema_v8).
create or replace function public._oauth_connections_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists oauth_connections_touch on public.oauth_connections;
create trigger oauth_connections_touch
    before update on public.oauth_connections
    for each row
    execute function public._oauth_connections_touch();

-- ---------------------------------------------------------------------------
-- social_accounts link
-- ---------------------------------------------------------------------------

alter table public.social_accounts
    add column if not exists oauth_connection_id uuid
    references public.oauth_connections(id) on delete set null;

create index if not exists social_accounts_oauth_conn_idx
    on public.social_accounts (oauth_connection_id);

-- ---------------------------------------------------------------------------
-- oauth_states
-- ---------------------------------------------------------------------------
-- Short-lived state tokens used during the OAuth redirect dance. Inserted on
-- /oauth/meta/init and consumed on /oauth/meta/callback to prevent CSRF.
-- Rows older than 15 minutes are considered expired.
-- ---------------------------------------------------------------------------

create table if not exists public.oauth_states (
    state          text primary key,
    workspace_id   uuid not null references public.workspaces(id) on delete cascade,
    provider       text not null check (provider in ('meta', 'tiktok', 'x')),
    redirect_after text,
    metadata       jsonb not null default '{}'::jsonb,
    created_at     timestamptz not null default now(),
    expires_at     timestamptz not null default (now() + interval '15 minutes')
);

create index if not exists oauth_states_expires_idx on public.oauth_states (expires_at);

-- ============================================================================
-- RLS stays OFF for the beta, matching schema_v8.
-- When auth lands, enable RLS on oauth_connections and oauth_states with a
-- policy keyed on workspace_id = auth.jwt() -> 'workspace_id'.
-- ============================================================================
