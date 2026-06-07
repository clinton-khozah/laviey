-- Quick fix when PostgREST says: Could not find table 'public.chat_conversations'
-- Run in Supabase SQL Editor (same project as your app).
-- Step 1: verify prerequisites
select
  to_regclass('public.match_pairs') as match_pairs,
  to_regclass('public.chat_conversations') as chat_conversations;

-- If match_pairs is NULL → run sql/008_discover_matching_engine.sql first.
-- If chat_conversations is NULL → run the FULL sql/011_chat_messaging.sql next.
-- After either run, execute:
notify pgrst, 'reload schema';

-- Step 2: confirm tables exist
select
  to_regclass('public.chat_conversations') as chat_conversations,
  to_regclass('public.chat_messages') as chat_messages,
  (select count(*) from public.chat_conversations) as conversation_count;
