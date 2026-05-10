-- ============================================================================
-- schema_v19_auth.sql -- additive, idempotent. Apply after schema_v18.sql.
--
-- Basic app authentication compatibility layer.
--
-- The frontend/backend use Supabase Auth for password sessions, while the
-- existing SmartMENA data model still contains public.users. The backend keeps
-- those two identities bridged by creating a public.users row with the same id
-- as the Supabase Auth user when needed.
--
-- workspace_memberships is the app-level membership table used by the current
-- database. It links public.users to workspaces and is the source of truth for
-- workspace access in the Express middleware.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.workspace_memberships (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id      uuid not null references public.users(id) on delete cascade,
    role         text not null default 'member'
                 check (role in ('owner', 'admin', 'member', 'viewer')),
    status       text not null default 'active'
                 check (status in ('active', 'invited', 'disabled')),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    unique (workspace_id, user_id)
);

create index if not exists workspace_memberships_user_idx
    on public.workspace_memberships (user_id, status);

create index if not exists workspace_memberships_workspace_idx
    on public.workspace_memberships (workspace_id, status);
