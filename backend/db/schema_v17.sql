-- ============================================================================
-- schema_v17.sql -- additive, idempotent. Apply after schema_v16.sql.
--
-- Azure OpenAI insights usage metering.
-- ============================================================================

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'llm_usage'
  ) then
    alter table public.llm_usage
      drop constraint if exists llm_usage_feature_check;

    alter table public.llm_usage
      add constraint llm_usage_feature_check
      check (feature in (
        'assistant',
        'caption_studio',
        'report_narrative',
        'competitor_digest',
        'insights'
      ));
  end if;
end $$;
