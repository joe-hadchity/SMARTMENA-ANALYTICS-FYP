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
    (null, 'ramadan-start-2026',   'Ramadan begins',          'بداية شهر رمضان',   '2026-02-17', 'religious', null, 'Holy month begins. Content should lean reflective and community-focused.', 'بداية الشهر الفضيل. يفضل محتوى تأملي ومجتمعي.'),
    (null, 'ramadan-end-2026',     'Ramadan ends',            'نهاية شهر رمضان',   '2026-03-18', 'religious', null, 'Last day of Ramadan, prep Eid creatives.', 'آخر أيام رمضان، جهّز محتوى العيد.'),
    (null, 'eid-al-fitr-2026',     'Eid al-Fitr',             'عيد الفطر',         '2026-03-19', 'religious', null, 'Major gifting and F&B peak.', 'ذروة مبيعات الهدايا والمطاعم.'),
    (null, 'eid-al-adha-2026',     'Eid al-Adha',             'عيد الأضحى',        '2026-05-27', 'religious', null, 'Family gifting, travel, and home content peak.', 'ذروة السفر والهدايا والمحتوى العائلي.'),
    (null, 'islamic-new-year-2026','Islamic New Year',        'رأس السنة الهجرية', '2026-06-16', 'religious', null, 'Soft reflective tone works well.', 'نبرة هادئة وتأملية.'),
    (null, 'ashura-2026',          'Day of Ashura',           'يوم عاشوراء',       '2026-06-25', 'religious', null, 'Observed in many MENA markets.', 'مناسبة متعارف عليها في معظم دول المنطقة.'),
    (null, 'white-friday-2026',    'White Friday',            'الجمعة البيضاء',    '2026-11-27', 'shopping',  null, 'The MENA answer to Black Friday. Plan campaigns 2 weeks ahead.', 'ذروة التخفيضات في المنطقة. خطّط للحملات قبل أسبوعين.'),
    (null, 'uae-national-day-2026','UAE National Day',        'اليوم الوطني الإماراتي','2026-12-02','holiday', 'AE', 'UAE-specific: themed visuals in red/white/black/green work best.', 'محتوى خاص بدولة الإمارات بألوان العلم.'),
    (null, 'ksa-national-day-2026','Saudi National Day',      'اليوم الوطني السعودي','2026-09-23','holiday', 'SA', 'KSA-specific: green themed content outperforms.', 'محتوى خاص بالمملكة بألوان العلم الأخضر.'),
    (null, 'qatar-national-day-2026','Qatar National Day',    'اليوم الوطني القطري','2026-12-18','holiday', 'QA', 'Qatar: heritage and maroon-themed creative.', 'محتوى قطري بهويّة تراثية.'),
    (null, 'egypt-revolution-day-2026','Egypt Revolution Day','ثورة 25 يناير',     '2026-01-25', 'holiday', 'EG', 'Egypt-specific: patriotic themes resonate.', 'محتوى وطني للسوق المصري.'),
    (null, 'valentines-day-2026',  'Valentine''s Day',        'عيد الحب',          '2026-02-14', 'shopping', null, 'Gifting, F&B, and experiences spike.', 'ذروة مبيعات الهدايا والمطاعم.'),
    (null, 'back-to-school-2026',  'Back-to-school window',   'موسم العودة للمدارس','2026-08-25','shopping', null, 'Plan Aug-Sep retail and edu campaigns.', 'خطّط لحملات القطاع التعليمي والتجزئة.')
on conflict do nothing;
