-- ============================================================================
-- Match detection RLS fix
-- Run after 008_discover_matching_engine.sql
-- ============================================================================

-- Keep actor full control over own swipe rows
drop policy if exists "Discover swipe events manageable by actor" on public.discover_swipe_events;
create policy "Discover swipe events manageable by actor"
  on public.discover_swipe_events for all
  using (auth.uid() = actor_user_id)
  with check (auth.uid() = actor_user_id);

-- Allow users to read inbound likes/super-likes so reciprocal match checks work
drop policy if exists "Discover swipe inbound likes readable by target" on public.discover_swipe_events;
create policy "Discover swipe inbound likes readable by target"
  on public.discover_swipe_events for select
  using (
    auth.uid() = target_user_id
    and action in ('like', 'super_like')
    and is_active = true
  );

-- Optional backfill: create active match pairs from existing reciprocal likes
insert into public.match_pairs (
  user_one_id,
  user_two_id,
  status,
  matched_at,
  matched_on_feed_type,
  context
)
select
  least(a.actor_user_id, a.target_user_id) as user_one_id,
  greatest(a.actor_user_id, a.target_user_id) as user_two_id,
  'active'::text as status,
  greatest(a.created_at, b.created_at) as matched_at,
  coalesce(a.feed_type, b.feed_type) as matched_on_feed_type,
  jsonb_build_object('source', 'rls_fix_backfill') as context
from public.discover_swipe_events a
join public.discover_swipe_events b
  on a.actor_user_id = b.target_user_id
 and a.target_user_id = b.actor_user_id
 and a.actor_user_id < a.target_user_id
where a.is_active = true
  and b.is_active = true
  and a.action in ('like', 'super_like')
  and b.action in ('like', 'super_like')
on conflict (
  (least(user_one_id, user_two_id)),
  (greatest(user_one_id, user_two_id))
)
do nothing;

notify pgrst, 'reload schema';
