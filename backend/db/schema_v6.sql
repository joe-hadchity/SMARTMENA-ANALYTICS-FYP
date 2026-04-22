-- ============================================================================
-- SmartMENA Analytics - Supabase / PostgreSQL schema v6 (Tier 1 foundation)
-- ----------------------------------------------------------------------------
-- Additive migration on top of schema_v5.sql. Safe to run multiple times.
-- Does NOT drop, rename, or change the type of any existing column.
-- ----------------------------------------------------------------------------
-- Introduces the Tier 1 AI-copilot foundation:
--   1. llm_usage       -- metering for every Azure OpenAI call (cost/token)
--   2. workspaces.*    -- additive brand_voice_json + industry_hint + region
--   3. conversations   -- per-workspace chat threads for the AI dock
--   4. messages        -- individual chat messages tied to a conversation
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. llm_usage  (new)
-- ---------------------------------------------------------------------------
-- Records every LLM call so we can meter token consumption, estimate USD cost,
-- enforce a monthly workspace budget, and later price tiers.
create table if not exists public.llm_usage (
    id                 uuid primary key default gen_random_uuid(),
    workspace_id       uuid references public.workspaces(id) on delete cascade,
    feature            text not null check (feature in (
                           'assistant',
                           'caption_studio',
                           'report_narrative',
                           'competitor_digest'
                       )),
    model              text not null,
    prompt_tokens      integer,
    completion_tokens  integer,
    cost_usd           numeric(10, 4),
    metadata_json      jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now()
);

create index if not exists llm_usage_workspace_idx
    on public.llm_usage (workspace_id);
create index if not exists llm_usage_feature_idx
    on public.llm_usage (feature);
create index if not exists llm_usage_created_at_idx
    on public.llm_usage (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. workspaces   -- additive brand voice + region columns
-- ---------------------------------------------------------------------------
-- industry_hint:       free-form string (e.g. "food_and_beverage", "fashion")
-- primary_region:      ISO-3166 alpha-2 country code (e.g. "AE", "SA")
-- brand_voice_json:    {
--                        tone_keywords: [], do: [], dont: [],
--                        sample_phrases: [],
--                        default_dialect: 'khaleeji'|'levantine'|'egyptian'|
--                                         'maghrebi'|'msa'
--                      }
alter table public.workspaces
    add column if not exists industry_hint      text,
    add column if not exists primary_region     text,
    add column if not exists brand_voice_json   jsonb not null default '{}'::jsonb;

create index if not exists workspaces_primary_region_idx
    on public.workspaces (primary_region);

-- ---------------------------------------------------------------------------
-- 3. conversations  (new)
-- ---------------------------------------------------------------------------
-- One row per chat thread in the floating AI dock (or any future assistant
-- surface). `title` can be auto-generated from the first user message.
create table if not exists public.conversations (
    id             uuid primary key default gen_random_uuid(),
    workspace_id   uuid not null references public.workspaces(id) on delete cascade,
    title          text,
    feature        text not null default 'assistant' check (feature in (
                       'assistant',
                       'caption_studio',
                       'other'
                   )),
    metadata_json  jsonb not null default '{}'::jsonb,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index if not exists conversations_workspace_idx
    on public.conversations (workspace_id);
create index if not exists conversations_updated_at_idx
    on public.conversations (updated_at desc);

-- ---------------------------------------------------------------------------
-- 4. messages  (new)
-- ---------------------------------------------------------------------------
-- Individual chat messages. `role` follows the OpenAI chat convention.
-- `prompt_tokens` / `completion_tokens` are nullable: the system row and the
-- streaming user row may not have a token count yet.
create table if not exists public.messages (
    id                 uuid primary key default gen_random_uuid(),
    conversation_id    uuid not null references public.conversations(id) on delete cascade,
    role               text not null check (role in ('user', 'assistant', 'system')),
    content            text not null,
    prompt_tokens      integer,
    completion_tokens  integer,
    metadata_json      jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now()
);

create index if not exists messages_conversation_idx
    on public.messages (conversation_id);
create index if not exists messages_created_at_idx
    on public.messages (created_at asc);

-- ============================================================================
-- Row-Level Security (RLS) stays OFF for the beta, consistent with earlier
-- schema files. When auth lands, enable RLS and add per-workspace policies.
-- ============================================================================
