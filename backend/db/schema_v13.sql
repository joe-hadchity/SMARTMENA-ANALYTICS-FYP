-- Phase 13 -- Evidence-first competitor approval queue.
--
-- This migration keeps the existing approved competitor tables intact and adds
-- a separate candidate layer so web/API suggestions are reviewed before being
-- saved as competitors.

create table if not exists public.competitor_candidates (
    id                     uuid primary key default gen_random_uuid(),
    workspace_id           uuid not null references public.workspaces(id) on delete cascade,
    platform               text not null
                           check (platform in (
                               'meta_instagram',
                               'meta_facebook',
                               'tiktok',
                               'x'
                           )),
    handle                 text not null,
    display_name           text,
    profile_url            text,
    avatar_url             text,
    region                 text,
    industry               text,
    tags                   text[] not null default '{}',
    source                 text not null default 'web_search'
                           check (source in (
                               'manual',
                               'brave_search',
                               'web_search',
                               'meta_business_discovery',
                               'apify'
                           )),
    status                 text not null default 'pending'
                           check (status in ('pending', 'approved', 'rejected')),
    relevance_score        numeric(6, 3) not null default 0,
    confidence             numeric(5, 4) not null default 0,
    rationale              text,
    signals                text[] not null default '{}',
    evidence_json          jsonb not null default '[]'::jsonb,
    raw_payload_json       jsonb not null default '{}'::jsonb,
    approved_competitor_id uuid references public.competitor_accounts(id) on delete set null,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now(),
    unique (workspace_id, platform, handle)
);

create index if not exists competitor_candidates_workspace_idx
    on public.competitor_candidates (workspace_id);
create index if not exists competitor_candidates_status_idx
    on public.competitor_candidates (status);
create index if not exists competitor_candidates_score_idx
    on public.competitor_candidates (relevance_score desc);

create or replace function public._competitor_candidates_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists competitor_candidates_touch on public.competitor_candidates;
create trigger competitor_candidates_touch
    before update on public.competitor_candidates
    for each row
    execute function public._competitor_candidates_touch();
