-- schema_v15: add media_url to competitor_posts and social_posts
-- Run this in Supabase SQL editor.

alter table public.competitor_posts
  add column if not exists media_url text;

alter table public.social_posts
  add column if not exists media_url text;

-- Back-fill media_url from raw_payload for existing Apify posts
update public.competitor_posts
set media_url = coalesce(
  raw_payload->>'displayUrl',
  raw_payload->>'imageUrl',
  raw_payload->'images'->0->>'url',
  raw_payload->>'thumbnailUrl'
)
where media_url is null
  and raw_payload is not null
  and raw_payload != '{}'::jsonb;
