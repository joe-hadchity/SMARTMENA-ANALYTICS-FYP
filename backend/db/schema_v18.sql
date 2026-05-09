-- ============================================================================
-- schema_v18.sql -- additive, idempotent. Apply after schema_v17.sql.
--
-- Unified Inbox MVP.
--
-- Stores Instagram comments and future Instagram Messaging API messages in one
-- workspace-scoped inbox. Meta reply calls write outbound rows so the UI can
-- show what SmartMENA sent even before webhooks are connected.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.inbox_items (
    id                 uuid primary key default gen_random_uuid(),
    workspace_id       uuid not null references public.workspaces(id) on delete cascade,
    social_account_id  uuid references public.social_accounts(id) on delete set null,
    social_post_id     uuid references public.social_posts(id) on delete set null,
    platform           text not null default 'instagram',
    provider           text not null default 'meta_graph',
    item_type          text not null check (item_type in ('comment', 'message')),
    direction          text not null default 'inbound' check (direction in ('inbound', 'outbound')),
    external_id        text not null,
    thread_external_id text,
    parent_external_id text,
    author_id          text,
    author_username    text,
    body               text not null,
    status             text not null default 'unread'
                       check (status in ('unread', 'read', 'replied', 'archived', 'failed')),
    permalink          text,
    published_at       timestamptz,
    raw_payload_json   jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    constraint inbox_items_unique_external unique (workspace_id, platform, item_type, external_id)
);

create index if not exists inbox_items_workspace_time_idx
    on public.inbox_items (workspace_id, published_at desc nulls last, created_at desc);
create index if not exists inbox_items_status_idx
    on public.inbox_items (workspace_id, status);
create index if not exists inbox_items_type_idx
    on public.inbox_items (workspace_id, item_type);
create index if not exists inbox_items_thread_idx
    on public.inbox_items (workspace_id, thread_external_id);

