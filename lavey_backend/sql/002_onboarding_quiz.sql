-- ============================================================================
-- Lavey onboarding quiz schema
-- Run in Supabase SQL Editor AFTER 001_api_routes.sql
--
-- Relationship map:
--   auth.users (Supabase)
--     └── profiles (1:1)
--           └── user_onboarding_responses (1:1 — one completed quiz per user)
--                 ├── onboarding_options (FK) — purpose, age, gender pref, etc.
--                 └── user_onboarding_interests (M:N) — min 3 interests
--   onboarding_questions (catalog)
--     └── onboarding_options (catalog)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions & enums
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'onboarding_question_kind') then
    create type public.onboarding_question_kind as enum ('single', 'multi', 'input');
  end if;

  if not exists (select 1 from pg_type where typname = 'onboarding_vibe') then
    create type public.onboarding_vibe as enum ('chill', 'bold', 'fun');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles — hub table linked to Supabase Auth
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default 'User',
  avatar_url text,
  bio text,
  date_of_birth date,
  vibe public.onboarding_vibe not null default 'chill',
  is_premium boolean not null default false,
  is_verified boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_lowercase check (email is null or email = lower(email)),
  constraint profiles_adult_dob check (
    date_of_birth is null
    or date_of_birth <= (current_date - interval '18 years')
  )
);

create index if not exists profiles_onboarding_completed_idx
  on public.profiles (onboarding_completed_at)
  where onboarding_completed_at is not null;

comment on table public.profiles is 'App profile for each authenticated user; mirrors key onboarding fields for matching.';

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
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
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Quiz catalog — questions & answer options
-- ---------------------------------------------------------------------------

create table if not exists public.onboarding_questions (
  id uuid primary key default gen_random_uuid(),
  step_key text not null unique,
  kind public.onboarding_question_kind not null,
  sort_order smallint not null,
  hero_emoji text not null default '✨',
  title text not null,
  subtitle text not null,
  min_selections smallint,
  max_selections smallint,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint onboarding_questions_sort_positive check (sort_order > 0),
  constraint onboarding_questions_min_selections check (
    min_selections is null or min_selections >= 1
  ),
  constraint onboarding_questions_max_gte_min check (
    max_selections is null
    or min_selections is null
    or max_selections >= min_selections
  )
);

create index if not exists onboarding_questions_active_sort_idx
  on public.onboarding_questions (sort_order)
  where is_active = true;

create table if not exists public.onboarding_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.onboarding_questions (id) on delete cascade,
  option_key text not null,
  label text not null,
  hint text not null default '',
  emoji text not null default '',
  sort_order smallint not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (question_id, option_key),
  constraint onboarding_options_sort_positive check (sort_order > 0)
);

create index if not exists onboarding_options_question_sort_idx
  on public.onboarding_options (question_id, sort_order)
  where is_active = true;

create index if not exists onboarding_options_key_idx
  on public.onboarding_options (option_key);

comment on table public.onboarding_questions is 'Onboarding quiz steps shown after sign-up.';
comment on table public.onboarding_options is 'Selectable answers for each onboarding question.';

-- ---------------------------------------------------------------------------
-- User responses — one row per user, interests in junction table
-- ---------------------------------------------------------------------------

create table if not exists public.user_onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (user_id) on delete cascade,
  quiz_version smallint not null default 1,
  purpose_option_id uuid not null references public.onboarding_options (id),
  age_preference_option_id uuid not null references public.onboarding_options (id),
  interested_in_option_id uuid not null references public.onboarding_options (id),
  orientation_option_id uuid not null references public.onboarding_options (id),
  religion_option_id uuid not null references public.onboarding_options (id),
  date_of_birth date not null,
  vibe public.onboarding_vibe not null default 'chill',
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_onboarding_adult_dob check (
    date_of_birth <= (current_date - interval '18 years')
  )
);

create index if not exists user_onboarding_responses_completed_idx
  on public.user_onboarding_responses (completed_at desc);

create table if not exists public.user_onboarding_interests (
  response_id uuid not null references public.user_onboarding_responses (id) on delete cascade,
  option_id uuid not null references public.onboarding_options (id),
  created_at timestamptz not null default now(),
  primary key (response_id, option_id)
);

create index if not exists user_onboarding_interests_option_idx
  on public.user_onboarding_interests (option_id);

comment on table public.user_onboarding_responses is 'Completed onboarding quiz for a user (single-select answers as FKs).';
comment on table public.user_onboarding_interests is 'Multi-select interests linked to a user onboarding response.';

-- ---------------------------------------------------------------------------
-- Validation — every FK option must belong to the correct question step
-- ---------------------------------------------------------------------------

create or replace function public.assert_onboarding_option_step(
  p_option_id uuid,
  p_step_key text
)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.onboarding_options o
    join public.onboarding_questions q on q.id = o.question_id
    where o.id = p_option_id
      and q.step_key = p_step_key
      and o.is_active
      and q.is_active
  ) then
    raise exception 'Option % is not valid for onboarding step %', p_option_id, p_step_key
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.validate_user_onboarding_response()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_onboarding_option_step(new.purpose_option_id, 'purpose');
  perform public.assert_onboarding_option_step(new.age_preference_option_id, 'age_preference');
  perform public.assert_onboarding_option_step(new.interested_in_option_id, 'interested_in');
  perform public.assert_onboarding_option_step(new.orientation_option_id, 'orientation');
  perform public.assert_onboarding_option_step(new.religion_option_id, 'religion');
  return new;
end;
$$;

drop trigger if exists trg_validate_user_onboarding_response on public.user_onboarding_responses;
create trigger trg_validate_user_onboarding_response
  before insert or update on public.user_onboarding_responses
  for each row
  execute function public.validate_user_onboarding_response();

create or replace function public.validate_user_onboarding_interest()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_onboarding_option_step(new.option_id, 'interests');
  return new;
end;
$$;

drop trigger if exists trg_validate_user_onboarding_interest on public.user_onboarding_interests;
create trigger trg_validate_user_onboarding_interest
  before insert on public.user_onboarding_interests
  for each row
  execute function public.validate_user_onboarding_interest();

create or replace function public.enforce_minimum_onboarding_interests()
returns trigger
language plpgsql
as $$
declare
  interest_count integer;
begin
  select count(*) into interest_count
  from public.user_onboarding_interests
  where response_id = coalesce(new.response_id, old.response_id);

  if tg_op = 'DELETE' then
    return old;
  end if;

  if interest_count < 3 then
    raise exception 'At least 3 interests are required (currently %)', interest_count
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Deferred so callers can insert interests in one transaction
drop trigger if exists trg_enforce_minimum_onboarding_interests on public.user_onboarding_interests;
create constraint trigger trg_enforce_minimum_onboarding_interests
  after insert or delete on public.user_onboarding_interests
  deferrable initially deferred
  for each row
  execute function public.enforce_minimum_onboarding_interests();

-- Sync profile when onboarding is saved
create or replace function public.sync_profile_from_onboarding()
returns trigger
language plpgsql
as $$
begin
  update public.profiles p
  set
    date_of_birth = new.date_of_birth,
    vibe = new.vibe,
    onboarding_completed_at = new.completed_at,
    updated_at = now()
  where p.user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_from_onboarding on public.user_onboarding_responses;
create trigger trg_sync_profile_from_onboarding
  after insert or update on public.user_onboarding_responses
  for each row
  execute function public.sync_profile_from_onboarding();

-- updated_at helper
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

drop trigger if exists trg_user_onboarding_responses_updated_at on public.user_onboarding_responses;
create trigger trg_user_onboarding_responses_updated_at
  before update on public.user_onboarding_responses
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Read model for matching & API
-- ---------------------------------------------------------------------------

create or replace view public.user_onboarding_details as
select
  r.user_id,
  r.quiz_version,
  r.date_of_birth,
  r.vibe,
  r.completed_at,
  purpose.option_key as purpose,
  purpose.label as purpose_label,
  age_pref.option_key as age_preference,
  age_pref.label as age_preference_label,
  interested.option_key as interested_in,
  interested.label as interested_in_label,
  orientation.option_key as orientation,
  orientation.label as orientation_label,
  religion.option_key as religion,
  religion.label as religion_label,
  coalesce(
    (
      select json_agg(
        json_build_object(
          'key', iopt.option_key,
          'label', iopt.label,
          'emoji', iopt.emoji
        )
        order by iopt.sort_order
      )
      from public.user_onboarding_interests ui
      join public.onboarding_options iopt on iopt.id = ui.option_id
      where ui.response_id = r.id
    ),
    '[]'::json
  ) as interests
from public.user_onboarding_responses r
join public.onboarding_options purpose on purpose.id = r.purpose_option_id
join public.onboarding_options age_pref on age_pref.id = r.age_preference_option_id
join public.onboarding_options interested on interested.id = r.interested_in_option_id
join public.onboarding_options orientation on orientation.id = r.orientation_option_id
join public.onboarding_options religion on religion.id = r.religion_option_id;

comment on view public.user_onboarding_details is 'Denormalized onboarding answers for matching queries and API responses.';

-- Resolve option UUID from step + key (used by backend services)
create or replace function public.resolve_onboarding_option_id(
  p_step_key text,
  p_option_key text
)
returns uuid
language sql
stable
as $$
  select o.id
  from public.onboarding_options o
  join public.onboarding_questions q on q.id = o.question_id
  where q.step_key = p_step_key
    and o.option_key = p_option_key
    and q.is_active
    and o.is_active
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.onboarding_questions enable row level security;
alter table public.onboarding_options enable row level security;
alter table public.user_onboarding_responses enable row level security;
alter table public.user_onboarding_interests enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Public read onboarding questions" on public.onboarding_questions;
create policy "Public read onboarding questions"
  on public.onboarding_questions for select
  using (is_active = true);

drop policy if exists "Public read onboarding options" on public.onboarding_options;
create policy "Public read onboarding options"
  on public.onboarding_options for select
  using (is_active = true);

drop policy if exists "Users read own onboarding" on public.user_onboarding_responses;
create policy "Users read own onboarding"
  on public.user_onboarding_responses for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own onboarding" on public.user_onboarding_responses;
create policy "Users insert own onboarding"
  on public.user_onboarding_responses for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own onboarding" on public.user_onboarding_responses;
create policy "Users update own onboarding"
  on public.user_onboarding_responses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own onboarding interests" on public.user_onboarding_interests;
create policy "Users read own onboarding interests"
  on public.user_onboarding_interests for select
  using (
    exists (
      select 1
      from public.user_onboarding_responses r
      where r.id = response_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage own onboarding interests" on public.user_onboarding_interests;
create policy "Users manage own onboarding interests"
  on public.user_onboarding_interests for all
  using (
    exists (
      select 1
      from public.user_onboarding_responses r
      where r.id = response_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.user_onboarding_responses r
      where r.id = response_id and r.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Seed quiz catalog (matches lavey_frontend onboardingQuiz.config.ts)
-- ---------------------------------------------------------------------------

insert into public.onboarding_questions (
  step_key, kind, sort_order, hero_emoji, title, subtitle, min_selections
) values
  (
    'purpose', 'single', 1, '✨',
    'What are you here for?',
    'We’ll tune who you see first',
    1
  ),
  (
    'age_preference', 'single', 2, '💫',
    'Preferred age range?',
    'Choose one age range you’re open to',
    1
  ),
  (
    'interested_in', 'single', 3, '💕',
    'Who are you interested in?',
    'Choose who you’d like to meet',
    1
  ),
  (
    'orientation', 'single', 4, '🌈',
    'How do you identify?',
    'Optional — helps us personalize your experience',
    1
  ),
  (
    'religion', 'single', 5, '🕊️',
    'Faith or worldview?',
    'Used for better compatibility insights',
    1
  ),
  (
    'interests', 'multi', 6, '🎯',
    'What are you into?',
    'Pick at least 3 — travel, shopping & more',
    3
  ),
  (
    'date_of_birth', 'input', 7, '🎂',
    'What’s your date of birth?',
    'Used for safety and age-appropriate matching',
    null
  )
on conflict (step_key) do update set
  kind = excluded.kind,
  sort_order = excluded.sort_order,
  hero_emoji = excluded.hero_emoji,
  title = excluded.title,
  subtitle = excluded.subtitle,
  min_selections = excluded.min_selections,
  is_active = excluded.is_active;

-- Purpose
insert into public.onboarding_options (question_id, option_key, label, hint, emoji, sort_order)
select q.id, v.option_key, v.label, v.hint, v.emoji, v.sort_order
from public.onboarding_questions q
cross join (
  values
    ('dating',     'Dating',     'Serious relationship & chemistry', '❤️', 1),
    ('friendship', 'Friendship', 'Good energy & new friends',        '🤝', 2),
    ('both',       'Both',       'Open to anything real',            '💫', 3)
) as v(option_key, label, hint, emoji, sort_order)
where q.step_key = 'purpose'
on conflict (question_id, option_key) do update set
  label = excluded.label,
  hint = excluded.hint,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order,
  is_active = true;

-- Age preference
insert into public.onboarding_options (question_id, option_key, label, hint, emoji, sort_order)
select q.id, v.option_key, v.label, v.hint, v.emoji, v.sort_order
from public.onboarding_questions q
cross join (
  values
    ('18-24',    '18–24',           'Younger crowd',       '🌸', 1),
    ('25-29',    '25–29',           'Mid-twenties',        '🌿', 2),
    ('30-34',    '30–34',           'Early thirties',      '☀️', 3),
    ('35-39',    '35–39',           'Late thirties',       '🍷', 4),
    ('40-44',    '40–44',           'Forties',             '🎩', 5),
    ('45+',      '45+',             'Mature matches',        '🥂', 6),
    ('open-all', 'Open to all ages', 'Age doesn’t matter', '🌍', 7)
) as v(option_key, label, hint, emoji, sort_order)
where q.step_key = 'age_preference'
on conflict (question_id, option_key) do update set
  label = excluded.label,
  hint = excluded.hint,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order,
  is_active = true;

-- Interested in
insert into public.onboarding_options (question_id, option_key, label, hint, emoji, sort_order)
select q.id, v.option_key, v.label, v.hint, v.emoji, v.sort_order
from public.onboarding_questions q
cross join (
  values
    ('men',       'Men',        'Interested in men',       '👨', 1),
    ('women',     'Women',      'Interested in women',     '👩', 2),
    ('nonbinary', 'Non-binary', 'Beyond the binary',       '🌈', 3),
    ('everyone',  'Everyone',   'Open to all genders',     '💫', 4)
) as v(option_key, label, hint, emoji, sort_order)
where q.step_key = 'interested_in'
on conflict (question_id, option_key) do update set
  label = excluded.label,
  hint = excluded.hint,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order,
  is_active = true;

-- Orientation
insert into public.onboarding_options (question_id, option_key, label, hint, emoji, sort_order)
select q.id, v.option_key, v.label, v.hint, v.emoji, v.sort_order
from public.onboarding_questions q
cross join (
  values
    ('straight',           'Straight',           'Attracted to another gender', '💑', 1),
    ('gay',                'Gay',                'Men attracted to men',        '🏳️‍🌈', 2),
    ('lesbian',            'Lesbian',            'Women attracted to women',    '💜', 3),
    ('bisexual',           'Bisexual',           'More than one gender',        '💗', 4),
    ('pansexual',          'Pansexual',          'Hearts over labels',          '💛', 5),
    ('queer',              'Queer',              'Fluid & expansive',           '🌈', 6),
    ('prefer-not-to-say',  'Prefer not to say',  'Totally fine',                '🤐', 7)
) as v(option_key, label, hint, emoji, sort_order)
where q.step_key = 'orientation'
on conflict (question_id, option_key) do update set
  label = excluded.label,
  hint = excluded.hint,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order,
  is_active = true;

-- Religion
insert into public.onboarding_options (question_id, option_key, label, hint, emoji, sort_order)
select q.id, v.option_key, v.label, v.hint, v.emoji, v.sort_order
from public.onboarding_questions q
cross join (
  values
    ('christian',          'Christian',          'Christian faith',             '✝️', 1),
    ('muslim',             'Muslim',             'Islamic faith',               '☪️', 2),
    ('hindu',              'Hindu',              'Hindu traditions',            '🕉️', 3),
    ('buddhist',           'Buddhist',           'Buddhist path',               '☸️', 4),
    ('jewish',             'Jewish',             'Jewish heritage',             '✡️', 5),
    ('spiritual',          'Spiritual',          'Not tied to one religion',    '✨', 6),
    ('agnostic',           'Agnostic',           'Unsure about faith',          '🤔', 7),
    ('atheist',            'Atheist',            'Secular worldview',           '🌌', 8),
    ('other',              'Other',              'Something else',              '📿', 9),
    ('prefer-not-to-say',  'Prefer not to say',  'Skip for now',                '🤐', 10)
) as v(option_key, label, hint, emoji, sort_order)
where q.step_key = 'religion'
on conflict (question_id, option_key) do update set
  label = excluded.label,
  hint = excluded.hint,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order,
  is_active = true;

-- Interests
insert into public.onboarding_options (question_id, option_key, label, hint, emoji, sort_order)
select q.id, v.option_key, v.label, v.hint, v.emoji, v.sort_order
from public.onboarding_questions q
cross join (
  values
    ('travel',    'Travel',        'Trips & adventures',      '✈️', 1),
    ('shopping',  'Shopping',      'Retail therapy',          '🛍️', 2),
    ('fitness',   'Fitness',       'Gym & active life',       '💪', 3),
    ('music',     'Music',         'Concerts & playlists',    '🎵', 4),
    ('food',      'Food & dining', 'Restaurants & cooking',   '🍽️', 5),
    ('nightlife', 'Nightlife',     'Bars, clubs & events',    '🌃', 6),
    ('gaming',    'Gaming',        'Console, PC & mobile',    '🎮', 7),
    ('reading',   'Reading',       'Books & stories',         '📚', 8),
    ('art',       'Art & design',  'Creative expression',     '🎨', 9),
    ('outdoors',  'Outdoors',      'Nature & hiking',         '🏕️', 10),
    ('pets',      'Pets',          'Dogs, cats & more',        '🐾', 11),
    ('tech',      'Tech',          'Gadgets & startups',      '💻', 12),
    ('movies',    'Movies & TV',   'Binge-worthy nights',     '🎬', 13),
    ('wellness',  'Wellness',      'Mind, body & balance',    '🧘', 14)
) as v(option_key, label, hint, emoji, sort_order)
where q.step_key = 'interests'
on conflict (question_id, option_key) do update set
  label = excluded.label,
  hint = excluded.hint,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order,
  is_active = true;

-- Backfill profiles for existing auth users (safe to re-run)
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

-- ---------------------------------------------------------------------------
-- API routes for onboarding persistence (backend handlers can be wired next)
-- ---------------------------------------------------------------------------

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('GET',  '/onboarding/questions', 'onboarding.listQuestions', 'List onboarding quiz steps and options'),
  ('GET',  '/users/me/onboarding',  'users.getOnboarding',    'Get current user onboarding answers'),
  ('POST', '/users/me/onboarding',  'users.submitOnboarding',   'Save onboarding quiz answers')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;

-- ---------------------------------------------------------------------------
-- Example: save onboarding in one transaction (for backend reference)
-- ---------------------------------------------------------------------------
--
-- begin;
-- insert into public.user_onboarding_responses (
--   user_id,
--   purpose_option_id,
--   age_preference_option_id,
--   interested_in_option_id,
--   orientation_option_id,
--   religion_option_id,
--   date_of_birth,
--   vibe,
--   completed_at
-- ) values (
--   auth.uid(),
--   public.resolve_onboarding_option_id('purpose', 'dating'),
--   public.resolve_onboarding_option_id('age_preference', '25-29'),
--   public.resolve_onboarding_option_id('interested_in', 'women'),
--   public.resolve_onboarding_option_id('orientation', 'straight'),
--   public.resolve_onboarding_option_id('religion', 'christian'),
--   date '1998-05-15',
--   'chill',
--   now()
-- )
-- returning id into _response_id;
--
-- insert into public.user_onboarding_interests (response_id, option_id)
-- select _response_id, public.resolve_onboarding_option_id('interests', key)
-- from unnest(array['travel', 'music', 'fitness']) as key;
-- commit;
