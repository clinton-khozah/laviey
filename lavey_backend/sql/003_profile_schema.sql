-- ============================================================================
-- Lavey profile schema (extends 002_onboarding_quiz.sql)
-- Run in Supabase SQL Editor after 002 (or standalone — creates profiles if missing)
--
-- Relationship map:
--   auth.users
--     └── profiles (1:1) — identity & editable profile fields
--           ├── profile_stats (1:1) — flames, matches, views, earnings
--           └── profile_interests (1:N) — display tags from edit profile
--     └── user_onboarding_responses (from 002) — quiz answers for matching
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core profile (hub table)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default 'User',
  avatar_url text,
  bio text not null default '',
  headline text,
  city text,
  pronouns text,
  date_of_birth date,
  vibe text not null default 'chill' check (vibe in ('chill', 'bold', 'fun')),
  is_premium boolean not null default false,
  is_verified boolean not null default false,
  show_on_discover boolean not null default true,
  onboarding_completed_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_lowercase check (email is null or email = lower(email)),
  constraint profiles_bio_length check (char_length(bio) <= 500),
  constraint profiles_headline_length check (headline is null or char_length(headline) <= 80),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 80),
  constraint profiles_adult_dob check (
    date_of_birth is null
    or date_of_birth <= (current_date - interval '18 years')
  )
);

alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists pronouns text;
alter table public.profiles add column if not exists latitude double precision;
alter table public.profiles add column if not exists longitude double precision;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists suburb text;
alter table public.profiles add column if not exists location_updated_at timestamptz;
alter table public.profiles add column if not exists show_on_discover boolean not null default true;
alter table public.profiles add column if not exists last_active_at timestamptz not null default now();

create index if not exists profiles_discover_idx
  on public.profiles (show_on_discover, last_active_at desc)
  where show_on_discover = true;

create index if not exists profiles_display_name_idx
  on public.profiles (display_name);

comment on table public.profiles is 'Editable user profile linked 1:1 to auth.users.';

-- ---------------------------------------------------------------------------
-- Profile stats — engagement counters (separate for clean updates)
-- ---------------------------------------------------------------------------

create table if not exists public.profile_stats (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  flames_sent integer not null default 0 check (flames_sent >= 0),
  matches_count integer not null default 0 check (matches_count >= 0),
  vibe_score smallint not null default 80 check (vibe_score between 0 and 100),
  profile_views integer not null default 0 check (profile_views >= 0),
  gift_earnings_cents integer not null default 0 check (gift_earnings_cents >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.profile_stats is 'Aggregated profile metrics; one row per user.';

-- ---------------------------------------------------------------------------
-- Profile interests — free-text tags from edit profile (comma-separated UI)
-- ---------------------------------------------------------------------------

create table if not exists public.profile_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  label text not null,
  sort_order smallint not null default 1 check (sort_order > 0),
  created_at timestamptz not null default now(),
  constraint profile_interests_label_length check (char_length(label) between 1 and 40),
  unique (user_id, label)
);

create index if not exists profile_interests_user_sort_idx
  on public.profile_interests (user_id, sort_order);

comment on table public.profile_interests is 'Display interests shown on profile; distinct from onboarding quiz interests.';

-- ---------------------------------------------------------------------------
-- Triggers & helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists trg_profile_stats_updated_at on public.profile_stats;
create trigger trg_profile_stats_updated_at
  before update on public.profile_stats
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (user_id) do update set
    email = excluded.email,
    display_name = coalesce(nullif(public.profiles.display_name, 'User'), excluded.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();

create or replace function public.handle_new_profile_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_stats (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row
  execute function public.handle_new_profile_stats();

create or replace function public.replace_profile_interests(
  p_user_id uuid,
  p_labels text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text[];
  lbl text;
  idx smallint := 0;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Not allowed to edit this profile' using errcode = '42501';
  end if;

  delete from public.profile_interests where user_id = p_user_id;

  cleaned := (
    select coalesce(array_agg(distinct trim(both from x)), '{}'::text[])
    from unnest(coalesce(p_labels, '{}'::text[])) as x
    where trim(both from x) <> ''
  );

  foreach lbl in array cleaned loop
    idx := idx + 1;
    insert into public.profile_interests (user_id, label, sort_order)
    values (p_user_id, lbl, idx);
  end loop;
end;
$$;

-- View uses pi.label only before migration 004 (option_id schema).
drop view if exists public.user_profile_details;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profile_interests'
      and column_name = 'option_id'
  ) then
    raise notice 'profile_interests uses option_id — skip 003 view (004 defines user_profile_details).';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profile_interests'
      and column_name = 'label'
  ) then
    execute $view$
      create view public.user_profile_details as
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
            select json_agg(pi.label order by pi.sort_order)
            from public.profile_interests pi
            where pi.user_id = p.user_id
          ),
          '[]'::json
        ) as interests
      from public.profiles p
      left join public.profile_stats s on s.user_id = p.user_id
    $view$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.profile_stats enable row level security;
alter table public.profile_interests enable row level security;

drop policy if exists "Profiles viewable by owner" on public.profiles;
create policy "Profiles viewable by owner"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Profiles discoverable when public" on public.profiles;
create policy "Profiles discoverable when public"
  on public.profiles for select
  using (show_on_discover = true);

drop policy if exists "Profiles updatable by owner" on public.profiles;
create policy "Profiles updatable by owner"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Profiles insertable by owner" on public.profiles;
create policy "Profiles insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Profile stats viewable by owner" on public.profile_stats;
create policy "Profile stats viewable by owner"
  on public.profile_stats for select
  using (auth.uid() = user_id);

drop policy if exists "Profile stats viewable when discoverable" on public.profile_stats;
create policy "Profile stats viewable when discoverable"
  on public.profile_stats for select
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = profile_stats.user_id and p.show_on_discover = true
    )
  );

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

-- Backfill stats & profiles for existing users
insert into public.profiles (user_id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, 'user'), '@', 1)
  ),
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  )
from auth.users u
on conflict (user_id) do nothing;

insert into public.profile_stats (user_id)
select p.user_id from public.profiles p
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- API routes
-- ---------------------------------------------------------------------------

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('PATCH', '/users/me', 'users.updateMyProfile', 'Update current user profile')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;
