-- ============================================================================
-- apply_missing_schemas.sql
--
-- Run this ONCE in the Supabase SQL Editor
-- (Project qnplnwadnbvcovaudmoq -> SQL Editor -> New Query)
--
-- It is additive and idempotent: safe to re-run. It concatenates all
-- incremental schemas that were not yet applied to the remote database,
-- bringing it up to v11 (Trend Radar).
-- ============================================================================

-- ############################################################################
-- schema_v3.sql
-- ############################################################################
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


-- ############################################################################
-- schema_v5.sql
-- ############################################################################
-- ============================================================================
-- SmartMENA Analytics - Supabase / PostgreSQL schema v5 (BETA, phase 4)
-- ----------------------------------------------------------------------------
-- Additive migration on top of `schema_v4.sql`. Safe to run multiple times.
-- Does NOT drop, rename, or change the type of any existing column.
-- ----------------------------------------------------------------------------
-- Introduces the explicit AI layer:
--   * ai_insights  -- adds plain `title`, `summary`, `source`, `created_at`
--                     columns beside the existing bilingual ones so the
--                     simpler startup-friendly shape can be consumed
--                     directly by the frontend and by future LLM producers.
--   * recommendations   (new)
--   * content_scores    (new) -- persists POST /api/content/score results
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. ai_insights  -- additive columns only
-- ---------------------------------------------------------------------------
-- The v2 table already carries (title_ar, title_en, body_ar, body_en,
-- severity, confidence, data, model_version, generated_at). We add a
-- flat, single-language projection alongside so the /api/workspaces/:id/
-- insights endpoint (and any LLM-based producer we add later) can read
-- and write the startup-friendly shape without touching the bilingual
-- fields.
alter table public.ai_insights
    add column if not exists title       text,
    add column if not exists summary     text,
    add column if not exists source      text,
    add column if not exists created_at  timestamptz not null default now();

create index if not exists ai_insights_created_at_idx
    on public.ai_insights (created_at desc);
create index if not exists ai_insights_source_idx
    on public.ai_insights (source);

-- ---------------------------------------------------------------------------
-- 2. recommendations  (new)
-- ---------------------------------------------------------------------------
-- Durable, human-readable recommendations attached to a workspace. The
-- MENA recommendations endpoint stays stateless (/api/recommendations/mena)
-- -- this table is for recommendations we want to persist, show on the
-- dashboard, and mark as acted-on later.
create table if not exists public.recommendations (
    id                  uuid primary key default gen_random_uuid(),
    workspace_id        uuid not null references public.workspaces(id) on delete cascade,
    recommendation_type text not null check (recommendation_type in (
                            'content',
                            'posting_time',
                            'mena_event',
                            'audience',
                            'budget',
                            'other'
                        )),
    title               text not null,
    description         text,
    priority            text not null default 'medium' check (priority in (
                            'low', 'medium', 'high'
                        )),
    data                jsonb not null default '{}'::jsonb,
    created_at          timestamptz not null default now()
);

create index if not exists recommendations_workspace_idx
    on public.recommendations (workspace_id);
create index if not exists recommendations_type_idx
    on public.recommendations (recommendation_type);
create index if not exists recommendations_priority_idx
    on public.recommendations (priority);
create index if not exists recommendations_created_at_idx
    on public.recommendations (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. content_scores  (new)
-- ---------------------------------------------------------------------------
-- Persists every POST /api/content/score call so the AI layer is
-- explainable (you can always show the user "what did the model say?"),
-- auditable, and queryable for retraining signals later.
create table if not exists public.content_scores (
    id                   uuid primary key default gen_random_uuid(),
    workspace_id         uuid not null references public.workspaces(id) on delete cascade,
    platform             text not null check (platform in (
                             'meta_instagram',
                             'meta_facebook',
                             'instagram',
                             'facebook',
                             'tiktok',
                             'x',
                             'twitter'
                         )),
    caption_text         text not null,
    predicted_sentiment  text check (predicted_sentiment in (
                             'positive', 'neutral', 'negative'
                         )),
    predicted_roi        numeric(10, 4),
    confidence_score     numeric(5, 4) check (
                             confidence_score is null
                             or (confidence_score >= 0 and confidence_score <= 1)
                         ),
    recommendation_text  text,
    data                 jsonb not null default '{}'::jsonb,
    created_at           timestamptz not null default now()
);

create index if not exists content_scores_workspace_idx
    on public.content_scores (workspace_id);
create index if not exists content_scores_platform_idx
    on public.content_scores (platform);
create index if not exists content_scores_created_at_idx
    on public.content_scores (created_at desc);

-- ============================================================================
-- Row-Level Security (RLS) stays OFF for the beta, consistent with earlier
-- schema files. When auth lands, enable RLS and add per-workspace policies.
-- ============================================================================


-- ############################################################################
-- schema_v6.sql
-- ############################################################################
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


-- ############################################################################
-- schema_v7.sql
-- ############################################################################
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


-- ############################################################################
-- schema_v8.sql
-- ############################################################################
-- ============================================================================
-- schema_v8.sql -- additive, idempotent. Apply after schema_v7.sql.
--
-- Introduces:
--   * mena_events      (new) -- calendar overlay for MENA holidays / shopping events
--   * scheduled_posts  (new) -- draft + scheduled content pipeline
--
-- Design:
--   * Additive only. Safe to re-run.
--   * RLS stays OFF for the beta (no auth yet).
--   * Global events have workspace_id=NULL; workspace-scoped custom events
--     carry a workspace_id and are only visible to that workspace.
--   * scheduled_posts is the backbone for the /calendar page: once scheduled,
--     a worker process picks due rows and hands them to platformIntegrations.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- mena_events: holidays, religious observances, shopping events.
-- ---------------------------------------------------------------------------

create table if not exists public.mena_events (
    id               uuid primary key default gen_random_uuid(),
    workspace_id     uuid references public.workspaces(id) on delete cascade,
    slug             text not null,
    title_en         text not null,
    title_ar         text,
    event_date       date not null,
    event_type       text not null default 'custom' check (
        event_type in (
            'holiday',       -- public / national holidays
            'religious',     -- Ramadan, Eid, Christmas
            'shopping',      -- White Friday, GITEX sales, back-to-school
            'local',         -- country-specific culturual events
            'custom'         -- workspace-scoped user events
        )
    ),
    region           text,          -- ISO-2 country, NULL = all MENA
    description_en   text,
    description_ar   text,
    metadata_json    jsonb not null default '{}'::jsonb,
    created_at       timestamptz not null default now()
);

create index if not exists mena_events_workspace_idx
    on public.mena_events (workspace_id);

create index if not exists mena_events_date_idx
    on public.mena_events (event_date);

create index if not exists mena_events_region_idx
    on public.mena_events (region);

-- Slug is unique per (workspace_id, slug). Global events use a NULL workspace_id.
create unique index if not exists mena_events_scope_slug_uniq
    on public.mena_events (coalesce(workspace_id::text, '*'), slug, event_date);

-- ---------------------------------------------------------------------------
-- scheduled_posts: drafts + scheduled outbound content.
-- ---------------------------------------------------------------------------

create table if not exists public.scheduled_posts (
    id                   uuid primary key default gen_random_uuid(),
    workspace_id         uuid not null references public.workspaces(id) on delete cascade,
    social_account_id    uuid references public.social_accounts(id) on delete set null,
    platform             text not null,
    caption              text not null,
    language             text check (language in ('ar', 'en', 'mix')),
    dialect              text,
    media_urls           jsonb not null default '[]'::jsonb,
    hashtags             jsonb not null default '[]'::jsonb,
    scheduled_at         timestamptz not null,
    status               text not null default 'scheduled' check (
        status in ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')
    ),
    published_at         timestamptz,
    external_post_id     text,
    error_message        text,
    content_score_json   jsonb not null default '{}'::jsonb,
    mena_event_id        uuid references public.mena_events(id) on delete set null,
    metadata_json        jsonb not null default '{}'::jsonb,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

create index if not exists scheduled_posts_workspace_idx
    on public.scheduled_posts (workspace_id);

create index if not exists scheduled_posts_account_idx
    on public.scheduled_posts (social_account_id);

create index if not exists scheduled_posts_due_idx
    on public.scheduled_posts (status, scheduled_at);

create index if not exists scheduled_posts_status_idx
    on public.scheduled_posts (status);

-- Auto-touch updated_at on any update.
create or replace function public._scheduled_posts_touch()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

do $$
begin
    if not exists (
        select 1 from pg_trigger
        where tgname = 'scheduled_posts_touch_updated_at'
    ) then
        create trigger scheduled_posts_touch_updated_at
            before update on public.scheduled_posts
            for each row execute function public._scheduled_posts_touch();
    end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Global MENA events seed (idempotent).
-- Dates are anchors for 2026; the scheduledPostService will help users pick
-- next-occurrence context, but they remain authoritative calendar pins.
-- Religious dates are approximate Gregorian mappings.
-- ---------------------------------------------------------------------------

insert into public.mena_events
    (workspace_id, slug, title_en, title_ar, event_date, event_type, region, description_en, description_ar)
values
    (null, 'ramadan-start-2026',   'Ramadan begins',          'Ø¨Ø¯Ø§ÙŠØ© Ø´Ù‡Ø± Ø±Ù…Ø¶Ø§Ù†',   '2026-02-17', 'religious', null, 'Holy month begins. Content should lean reflective and community-focused.', 'Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø´Ù‡Ø± Ø§Ù„ÙØ¶ÙŠÙ„. ÙŠÙØ¶Ù„ Ù…Ø­ØªÙˆÙ‰ ØªØ£Ù…Ù„ÙŠ ÙˆÙ…Ø¬ØªÙ…Ø¹ÙŠ.'),
    (null, 'ramadan-end-2026',     'Ramadan ends',            'Ù†Ù‡Ø§ÙŠØ© Ø´Ù‡Ø± Ø±Ù…Ø¶Ø§Ù†',   '2026-03-18', 'religious', null, 'Last day of Ramadan, prep Eid creatives.', 'Ø¢Ø®Ø± Ø£ÙŠØ§Ù… Ø±Ù…Ø¶Ø§Ù†ØŒ Ø¬Ù‡Ù‘Ø² Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¹ÙŠØ¯.'),
    (null, 'eid-al-fitr-2026',     'Eid al-Fitr',             'Ø¹ÙŠØ¯ Ø§Ù„ÙØ·Ø±',         '2026-03-19', 'religious', null, 'Major gifting and F&B peak.', 'Ø°Ø±ÙˆØ© Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„Ù‡Ø¯Ø§ÙŠØ§ ÙˆØ§Ù„Ù…Ø·Ø§Ø¹Ù….'),
    (null, 'eid-al-adha-2026',     'Eid al-Adha',             'Ø¹ÙŠØ¯ Ø§Ù„Ø£Ø¶Ø­Ù‰',        '2026-05-27', 'religious', null, 'Family gifting, travel, and home content peak.', 'Ø°Ø±ÙˆØ© Ø§Ù„Ø³ÙØ± ÙˆØ§Ù„Ù‡Ø¯Ø§ÙŠØ§ ÙˆØ§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø¹Ø§Ø¦Ù„ÙŠ.'),
    (null, 'islamic-new-year-2026','Islamic New Year',        'Ø±Ø£Ø³ Ø§Ù„Ø³Ù†Ø© Ø§Ù„Ù‡Ø¬Ø±ÙŠØ©', '2026-06-16', 'religious', null, 'Soft reflective tone works well.', 'Ù†Ø¨Ø±Ø© Ù‡Ø§Ø¯Ø¦Ø© ÙˆØªØ£Ù…Ù„ÙŠØ©.'),
    (null, 'ashura-2026',          'Day of Ashura',           'ÙŠÙˆÙ… Ø¹Ø§Ø´ÙˆØ±Ø§Ø¡',       '2026-06-25', 'religious', null, 'Observed in many MENA markets.', 'Ù…Ù†Ø§Ø³Ø¨Ø© Ù…ØªØ¹Ø§Ø±Ù Ø¹Ù„ÙŠÙ‡Ø§ ÙÙŠ Ù…Ø¹Ø¸Ù… Ø¯ÙˆÙ„ Ø§Ù„Ù…Ù†Ø·Ù‚Ø©.'),
    (null, 'white-friday-2026',    'White Friday',            'Ø§Ù„Ø¬Ù…Ø¹Ø© Ø§Ù„Ø¨ÙŠØ¶Ø§Ø¡',    '2026-11-27', 'shopping',  null, 'The MENA answer to Black Friday. Plan campaigns 2 weeks ahead.', 'Ø°Ø±ÙˆØ© Ø§Ù„ØªØ®ÙÙŠØ¶Ø§Øª ÙÙŠ Ø§Ù„Ù…Ù†Ø·Ù‚Ø©. Ø®Ø·Ù‘Ø· Ù„Ù„Ø­Ù…Ù„Ø§Øª Ù‚Ø¨Ù„ Ø£Ø³Ø¨ÙˆØ¹ÙŠÙ†.'),
    (null, 'uae-national-day-2026','UAE National Day',        'Ø§Ù„ÙŠÙˆÙ… Ø§Ù„ÙˆØ·Ù†ÙŠ Ø§Ù„Ø¥Ù…Ø§Ø±Ø§ØªÙŠ','2026-12-02','holiday', 'AE', 'UAE-specific: themed visuals in red/white/black/green work best.', 'Ù…Ø­ØªÙˆÙ‰ Ø®Ø§Øµ Ø¨Ø¯ÙˆÙ„Ø© Ø§Ù„Ø¥Ù…Ø§Ø±Ø§Øª Ø¨Ø£Ù„ÙˆØ§Ù† Ø§Ù„Ø¹Ù„Ù….'),
    (null, 'ksa-national-day-2026','Saudi National Day',      'Ø§Ù„ÙŠÙˆÙ… Ø§Ù„ÙˆØ·Ù†ÙŠ Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠ','2026-09-23','holiday', 'SA', 'KSA-specific: green themed content outperforms.', 'Ù…Ø­ØªÙˆÙ‰ Ø®Ø§Øµ Ø¨Ø§Ù„Ù…Ù…Ù„ÙƒØ© Ø¨Ø£Ù„ÙˆØ§Ù† Ø§Ù„Ø¹Ù„Ù… Ø§Ù„Ø£Ø®Ø¶Ø±.'),
    (null, 'qatar-national-day-2026','Qatar National Day',    'Ø§Ù„ÙŠÙˆÙ… Ø§Ù„ÙˆØ·Ù†ÙŠ Ø§Ù„Ù‚Ø·Ø±ÙŠ','2026-12-18','holiday', 'QA', 'Qatar: heritage and maroon-themed creative.', 'Ù…Ø­ØªÙˆÙ‰ Ù‚Ø·Ø±ÙŠ Ø¨Ù‡ÙˆÙŠÙ‘Ø© ØªØ±Ø§Ø«ÙŠØ©.'),
    (null, 'egypt-revolution-day-2026','Egypt Revolution Day','Ø«ÙˆØ±Ø© 25 ÙŠÙ†Ø§ÙŠØ±',     '2026-01-25', 'holiday', 'EG', 'Egypt-specific: patriotic themes resonate.', 'Ù…Ø­ØªÙˆÙ‰ ÙˆØ·Ù†ÙŠ Ù„Ù„Ø³ÙˆÙ‚ Ø§Ù„Ù…ØµØ±ÙŠ.'),
    (null, 'valentines-day-2026',  'Valentine''s Day',        'Ø¹ÙŠØ¯ Ø§Ù„Ø­Ø¨',          '2026-02-14', 'shopping', null, 'Gifting, F&B, and experiences spike.', 'Ø°Ø±ÙˆØ© Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„Ù‡Ø¯Ø§ÙŠØ§ ÙˆØ§Ù„Ù…Ø·Ø§Ø¹Ù….'),
    (null, 'back-to-school-2026',  'Back-to-school window',   'Ù…ÙˆØ³Ù… Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ù…Ø¯Ø§Ø±Ø³','2026-08-25','shopping', null, 'Plan Aug-Sep retail and edu campaigns.', 'Ø®Ø·Ù‘Ø· Ù„Ø­Ù…Ù„Ø§Øª Ø§Ù„Ù‚Ø·Ø§Ø¹ Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠ ÙˆØ§Ù„ØªØ¬Ø²Ø¦Ø©.')
on conflict do nothing;


-- ############################################################################
-- schema_v9.sql
-- ############################################################################
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


-- ############################################################################
-- schema_v10.sql
-- ############################################################################
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


-- ############################################################################
-- schema_v11.sql
-- ############################################################################
-- ============================================================================
-- schema_v11.sql -- additive, idempotent. Apply after schema_v10.sql.
--
-- Phase 7 Layer 1 -- Trend discovery.
--
-- Introduces:
--   * trend_terms       (new) -- normalized catalog of hashtags / topics /
--                                formats / sounds we have ever seen in a
--                                workspace. One row per (workspace, kind,
--                                value).
--   * trend_snapshots   (new) -- daily rollup of how each term performed
--                                (post_count, engagement, unique authors,
--                                platform + source breakdown, sample posts).
--
-- Plus a helper view `v_trend_window_base` that makes windowed aggregations
-- cheap on the read path.
--
-- Design notes:
--   * Additive only. Safe to re-run. Re-aggregation is idempotent because
--     `trend_snapshots.unique (trend_term_id, day)` lets us upsert per-day.
--   * Sources are identified as either `own` (the workspace's social_posts)
--     or `competitor` (competitor_posts). The source_breakdown JSON on each
--     snapshot preserves that split for UI filtering.
--   * Kinds supported in Layer 1:
--       - hashtag  -> extracted from caption text (unicode-aware)
--       - topic    -> LLM / rule-labelled semantic bucket
--       - format   -> normalized media_type (reel / carousel / image / video)
--       - sound    -> audio_id from platform payload; mocked otherwise
--   * RLS stays OFF for the beta (matches earlier schema files).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- trend_terms
-- ---------------------------------------------------------------------------

create table if not exists public.trend_terms (
    id              uuid primary key default gen_random_uuid(),
    workspace_id    uuid not null references public.workspaces(id) on delete cascade,
    kind            text not null
                    check (kind in ('hashtag', 'topic', 'format', 'sound')),
    value           text not null,              -- normalized: lowercased hashtag, snake_case topic, etc.
    display_label   text,                       -- pretty form for UI (e.g. "#Ramadan" or "Food Review")
    metadata        jsonb not null default '{}'::jsonb,
    first_seen_at   timestamptz not null default now(),
    last_seen_at    timestamptz not null default now(),
    unique (workspace_id, kind, value)
);

create index if not exists trend_terms_workspace_idx
    on public.trend_terms (workspace_id);
create index if not exists trend_terms_ws_kind_idx
    on public.trend_terms (workspace_id, kind);
create index if not exists trend_terms_last_seen_idx
    on public.trend_terms (last_seen_at desc);

-- ---------------------------------------------------------------------------
-- trend_snapshots (one row per (term, day))
-- ---------------------------------------------------------------------------

create table if not exists public.trend_snapshots (
    id                  uuid primary key default gen_random_uuid(),
    trend_term_id       uuid not null references public.trend_terms(id) on delete cascade,
    workspace_id        uuid not null references public.workspaces(id) on delete cascade,
    day                 date not null,
    post_count          integer not null default 0 check (post_count >= 0),
    engagement_sum      numeric not null default 0,
    engagement_avg      numeric not null default 0,
    unique_authors      integer not null default 0 check (unique_authors >= 0),
    platform_breakdown  jsonb not null default '{}'::jsonb,   -- { meta_instagram: 12, tiktok: 3 }
    source_breakdown    jsonb not null default '{}'::jsonb,   -- { own: 2, competitor: 13 }
    sample_post_ids     jsonb not null default '[]'::jsonb,   -- top-3 posts for drill-down
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    unique (trend_term_id, day)
);

create index if not exists trend_snapshots_ws_day_idx
    on public.trend_snapshots (workspace_id, day desc);
create index if not exists trend_snapshots_term_day_idx
    on public.trend_snapshots (trend_term_id, day desc);

-- updated_at trigger for snapshots (so we can tell when a day was re-aggregated)
create or replace function public._trend_snapshots_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trend_snapshots_touch on public.trend_snapshots;
create trigger trend_snapshots_touch
    before update on public.trend_snapshots
    for each row
    execute function public._trend_snapshots_touch();

-- ---------------------------------------------------------------------------
-- v_trend_window_base (view)
-- ---------------------------------------------------------------------------
-- A thin convenience view that joins terms to their snapshots without doing
-- the time-window filter. The read service adds the `day >= ...` filter at
-- query time so we can reuse the same view for 7d / 14d / 30d.
-- ---------------------------------------------------------------------------

create or replace view public.v_trend_window_base as
select
    t.id              as trend_term_id,
    t.workspace_id,
    t.kind,
    t.value,
    t.display_label,
    t.metadata        as term_metadata,
    s.day,
    s.post_count,
    s.engagement_sum,
    s.engagement_avg,
    s.unique_authors,
    s.platform_breakdown,
    s.source_breakdown,
    s.sample_post_ids
from public.trend_terms t
join public.trend_snapshots s on s.trend_term_id = t.id;

-- ============================================================================
-- RLS stays OFF for the beta.
-- ============================================================================


