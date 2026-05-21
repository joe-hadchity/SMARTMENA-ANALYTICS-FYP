-- ============================================================================
-- SmartMENA Analytics - Schema v20: Advisor Conversations
-- ----------------------------------------------------------------------------
-- Persistent storage for AI Advisor chat conversations
-- Enables multi-conversation history and session resumption
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. advisor_conversations
-- ---------------------------------------------------------------------------
-- Metadata for each conversation session with the AI Advisor
create table if not exists public.advisor_conversations (
    id                      uuid primary key default gen_random_uuid(),
    workspace_id            uuid not null references public.workspaces(id) on delete cascade,

    -- Session continuity: The sessionId returned by Fyp/Claude SDK
    -- This is passed back to Fyp to maintain context across messages
    external_session_id     text unique,

    -- Conversation metadata
    title                   text not null,              -- Auto-generated from first message
    mode                    text not null default 'general'
                            check (mode in ('general', 'create_campaign')),

    -- Status tracking
    status                  text not null default 'active'
                            check (status in ('active', 'archived')),

    -- Statistics
    message_count           integer not null default 0 check (message_count >= 0),

    -- Timestamps
    created_at              timestamptz not null default now(),
    last_message_at         timestamptz not null default now(),

    -- Metadata for custom tags, campaign associations, etc.
    metadata                jsonb not null default '{}'::jsonb
);

create index if not exists advisor_conversations_workspace_idx
    on public.advisor_conversations (workspace_id);
create index if not exists advisor_conversations_external_session_idx
    on public.advisor_conversations (external_session_id);
create index if not exists advisor_conversations_last_message_idx
    on public.advisor_conversations (last_message_at desc);
create index if not exists advisor_conversations_status_idx
    on public.advisor_conversations (status);

-- ---------------------------------------------------------------------------
-- 2. advisor_messages
-- ---------------------------------------------------------------------------
-- Individual messages within a conversation
create table if not exists public.advisor_messages (
    id                      uuid primary key default gen_random_uuid(),
    conversation_id         uuid not null references public.advisor_conversations(id) on delete cascade,

    -- Message content
    role                    text not null check (role in ('user', 'assistant')),
    content                 text not null,

    -- Metadata from Fyp response
    campaign_created        boolean not null default false,
    campaign_id             text,                       -- External campaign ID if created

    -- Timestamps
    created_at              timestamptz not null default now(),

    -- Additional metadata (token usage, processing time, etc.)
    metadata                jsonb not null default '{}'::jsonb
);

create index if not exists advisor_messages_conversation_idx
    on public.advisor_messages (conversation_id);
create index if not exists advisor_messages_created_idx
    on public.advisor_messages (created_at asc);
create index if not exists advisor_messages_role_idx
    on public.advisor_messages (role);

-- ---------------------------------------------------------------------------
-- 3. Helper function: Update conversation statistics
-- ---------------------------------------------------------------------------
-- Automatically maintains message_count and last_message_at on conversations
create or replace function public.update_advisor_conversation_stats()
returns trigger as $$
begin
    update public.advisor_conversations
    set
        message_count = message_count + 1,
        last_message_at = NEW.created_at
    where id = NEW.conversation_id;

    return NEW;
end;
$$ language plpgsql;

-- Trigger on message insert
drop trigger if exists advisor_message_stats_trigger on public.advisor_messages;
create trigger advisor_message_stats_trigger
    after insert on public.advisor_messages
    for each row
    execute function public.update_advisor_conversation_stats();

-- ---------------------------------------------------------------------------
-- 4. Helper function: Generate conversation title from first message
-- ---------------------------------------------------------------------------
-- Extracts first 60 characters from the user's initial message as title
create or replace function public.generate_advisor_conversation_title(
    p_conversation_id uuid_
)
returns text as $$
declare
    v_title text;
begin
    select substring(content from 1 for 60)
    into v_title
    from public.advisor_messages
    where conversation_id = p_conversation_id
      and role = 'user'
    order by created_at asc
    limit 1;

    return coalesce(v_title, 'New Conversation');
end;
$$ language plpgsql;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
comment on table public.advisor_conversations is
    'AI Advisor conversation sessions with metadata and session continuity';
comment on column public.advisor_conversations.external_session_id is
    'SessionId from Fyp/Claude SDK - pass this back to resume context';
comment on column public.advisor_conversations.mode is
    'Conversation mode: general chat or campaign creation workflow';

comment on table public.advisor_messages is
    'Individual messages (user/assistant) within advisor conversations';
comment on column public.advisor_messages.campaign_created is
    'Flag indicating if this message resulted in campaign creation';

-- ============================================================================
-- Row-Level Security (RLS)
-- ----------------------------------------------------------------------------
-- RLS stays OFF for beta, but prepared for future workspace-scoped policies
-- ============================================================================
