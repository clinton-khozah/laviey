-- ============================================================================
-- Admin member directory view + API route
-- Run after 003, 007, 010. Requires service role on backend for /admin/users.
-- ============================================================================

create or replace view public.admin_member_records as
select
  p.user_id,
  p.email,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.city,
  p.pronouns,
  p.is_premium,
  p.is_verified,
  p.date_of_birth,
  p.last_active_at,
  p.created_at,
  p.onboarding_completed_at,
  coalesce(s.matches_count, 0)::integer as matches_count,
  coalesce(s.profile_views, 0)::integer as profile_views,
  coalesce(s.vibe_score, 80)::integer as vibe_score,
  (
    select count(*)::integer
    from public.profile_post_likes l
    join public.profile_posts pp on pp.id = l.post_id
    where pp.user_id = p.user_id
  ) as likes_received_count,
  (p.created_at >= (now() - interval '7 days')) as is_new_user,
  (
    coalesce(s.vibe_score, 0) >= 88
    or coalesce(s.matches_count, 0) >= 40
  ) as is_top_user
from public.profiles p
left join public.profile_stats s on s.user_id = p.user_id;

comment on view public.admin_member_records is 'Admin dashboard member list (service role reads).';

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('GET', '/admin/users', 'admin.listUsers', 'List members for admin user management')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;

notify pgrst, 'reload schema';
