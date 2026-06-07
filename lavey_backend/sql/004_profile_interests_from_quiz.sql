-- ============================================================================
-- Profile interests → onboarding quiz options (single source of truth)
-- Run after 002_onboarding_quiz.sql and 003_profile_schema.sql
-- ============================================================================

-- View depends on profile_interests — drop first, recreate at end of this file
drop view if exists public.user_profile_details;

-- Recover if a previous run dropped profile_interests but did not finish the rename
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profile_interests_new'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profile_interests'
  ) then
    alter table public.profile_interests_new rename to profile_interests;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profile_interests'
  ) then
    create table public.profile_interests (
      user_id uuid not null references public.profiles (user_id) on delete cascade,
      option_id uuid not null references public.onboarding_options (id) on delete restrict,
      sort_order smallint not null default 1 check (sort_order > 0),
      created_at timestamptz not null default now(),
      primary key (user_id, option_id)
    );
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profile_interests'
      and column_name = 'option_id'
  ) then
    -- Clean up from a previous failed migration attempt
    drop table if exists public.profile_interests_new;

    create table public.profile_interests_new (
      user_id uuid not null references public.profiles (user_id) on delete cascade,
      option_id uuid not null references public.onboarding_options (id) on delete restrict,
      sort_order smallint not null default 1 check (sort_order > 0),
      created_at timestamptz not null default now(),
      primary key (user_id, option_id)
    );

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profile_interests'
        and column_name = 'label'
    ) then
      insert into public.profile_interests_new (user_id, option_id, sort_order, created_at)
      select
        pi.user_id,
        o.id,
        pi.sort_order,
        pi.created_at
      from public.profile_interests pi
      join public.onboarding_options o on (
        lower(pi.label) = lower(o.label)
        or lower(pi.label) = lower(o.option_key)
      )
      join public.onboarding_questions q on q.id = o.question_id and q.step_key = 'interests';
    end if;

    drop table public.profile_interests;
    alter table public.profile_interests_new rename to profile_interests;
  end if;
end $$;

create index if not exists profile_interests_user_sort_idx
  on public.profile_interests (user_id, sort_order);

comment on table public.profile_interests is
  'Profile display interests — each row links to onboarding_options (interests step).';

create or replace function public.seed_profile_interests_from_onboarding(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  insert into public.profile_interests (user_id, option_id, sort_order)
  select
    p_user_id,
    ui.option_id,
    row_number() over (order by ui.created_at)::smallint
  from public.user_onboarding_interests ui
  join public.user_onboarding_responses r on r.id = ui.response_id
  where r.user_id = p_user_id
  on conflict (user_id, option_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.replace_profile_interest_keys(
  p_user_id uuid,
  p_option_keys text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Not allowed to edit this profile' using errcode = '42501';
  end if;

  delete from public.profile_interests where user_id = p_user_id;

  insert into public.profile_interests (user_id, option_id, sort_order)
  select
    p_user_id,
    o.id,
    row_number() over (order by k.ord)::smallint
  from unnest(coalesce(p_option_keys, '{}'::text[])) with ordinality as k(option_key, ord)
  join public.onboarding_options o on o.option_key = k.option_key and o.is_active
  join public.onboarding_questions q on q.id = o.question_id
    and q.step_key = 'interests'
    and q.is_active;
end;
$$;

drop function if exists public.replace_profile_interests(uuid, text[]);

create or replace view public.user_profile_details as
select
  p.user_id,
  p.email,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.headline,
  p.city,
  p.pronouns,
  p.date_of_birth,
  p.vibe,
  p.is_premium,
  p.is_verified,
  p.show_on_discover,
  p.onboarding_completed_at,
  p.last_active_at,
  p.created_at,
  p.updated_at,
  coalesce(s.flames_sent, 0) as flames_sent,
  coalesce(s.matches_count, 0) as matches_count,
  coalesce(s.vibe_score, 80) as vibe_score,
  coalesce(s.profile_views, 0) as profile_views,
  coalesce(s.gift_earnings_cents, 0) as gift_earnings_cents,
  coalesce(
    (
      select json_agg(
        json_build_object(
          'key', o.option_key,
          'label', o.label,
          'emoji', o.emoji
        )
        order by pi.sort_order
      )
      from public.profile_interests pi
      join public.onboarding_options o on o.id = pi.option_id
      where pi.user_id = p.user_id
    ),
    '[]'::json
  ) as interests
from public.profiles p
left join public.profile_stats s on s.user_id = p.user_id;

alter table public.profile_interests enable row level security;

drop policy if exists "Profile interests viewable by owner" on public.profile_interests;
create policy "Profile interests viewable by owner"
  on public.profile_interests for select
  using (auth.uid() = user_id);

drop policy if exists "Profile interests viewable when discoverable" on public.profile_interests;
create policy "Profile interests viewable when discoverable"
  on public.profile_interests for select
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = profile_interests.user_id and p.show_on_discover = true
    )
  );

drop policy if exists "Profile interests manageable by owner" on public.profile_interests;
create policy "Profile interests manageable by owner"
  on public.profile_interests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('GET', '/onboarding/interests', 'onboarding.listInterestOptions', 'List interest options from quiz catalog')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;
