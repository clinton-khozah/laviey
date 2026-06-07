-- ============================================================================
-- Discover feed + matching engine
-- Run after 002, 003, 004, 006, 007
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Algorithm catalog + rollout assignment
-- ---------------------------------------------------------------------------

create table if not exists public.discover_algorithm_variants (
  id text primary key,
  feed_type text not null check (feed_type in ('for-you', 'nearby')),
  name text not null,
  code text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  is_default boolean not null default false,
  score_weights jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists discover_algorithm_default_idx
  on public.discover_algorithm_variants (feed_type)
  where is_default = true;

create table if not exists public.discover_algorithm_assignments (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  feed_type text not null check (feed_type in ('for-you', 'nearby')),
  algorithm_id text not null references public.discover_algorithm_variants (id) on delete restrict,
  assigned_by uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, feed_type)
);

-- ---------------------------------------------------------------------------
-- Feed telemetry
-- ---------------------------------------------------------------------------

create table if not exists public.discover_feed_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  feed_type text not null check (feed_type in ('for-you', 'nearby')),
  algorithm_id text references public.discover_algorithm_variants (id) on delete set null,
  client_session_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_impressions integer not null default 0 check (total_impressions >= 0),
  total_likes integer not null default 0 check (total_likes >= 0),
  total_passes integer not null default 0 check (total_passes >= 0)
);

create index if not exists discover_feed_sessions_user_started_idx
  on public.discover_feed_sessions (user_id, started_at desc);

create table if not exists public.discover_feed_impressions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles (user_id) on delete cascade,
  target_user_id uuid not null references public.profiles (user_id) on delete cascade,
  session_id uuid references public.discover_feed_sessions (id) on delete set null,
  feed_type text not null check (feed_type in ('for-you', 'nearby')),
  algorithm_id text references public.discover_algorithm_variants (id) on delete set null,
  rank_position integer check (rank_position is null or rank_position >= 1),
  score numeric(10, 5),
  seen_at timestamptz not null default now(),
  dwell_ms integer check (dwell_ms is null or dwell_ms >= 0),
  created_at timestamptz not null default now(),
  constraint discover_feed_impressions_actor_target_check check (actor_user_id <> target_user_id)
);

create index if not exists discover_feed_impressions_actor_seen_idx
  on public.discover_feed_impressions (actor_user_id, seen_at desc);

create index if not exists discover_feed_impressions_target_seen_idx
  on public.discover_feed_impressions (target_user_id, seen_at desc);

-- ---------------------------------------------------------------------------
-- Swipe / reaction graph
-- ---------------------------------------------------------------------------

create table if not exists public.discover_swipe_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles (user_id) on delete cascade,
  target_user_id uuid not null references public.profiles (user_id) on delete cascade,
  session_id uuid references public.discover_feed_sessions (id) on delete set null,
  impression_id uuid references public.discover_feed_impressions (id) on delete set null,
  feed_type text not null check (feed_type in ('for-you', 'nearby')),
  action text not null check (action in ('pass', 'like', 'super_like', 'hide', 'report')),
  signal_strength smallint not null default 1 check (signal_strength between 1 and 5),
  algorithm_id text references public.discover_algorithm_variants (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint discover_swipe_events_actor_target_check check (actor_user_id <> target_user_id)
);

create index if not exists discover_swipe_events_actor_target_created_idx
  on public.discover_swipe_events (actor_user_id, target_user_id, created_at desc);

create index if not exists discover_swipe_events_target_actor_created_idx
  on public.discover_swipe_events (target_user_id, actor_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Match graph
-- ---------------------------------------------------------------------------

create table if not exists public.match_pairs (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references public.profiles (user_id) on delete cascade,
  user_two_id uuid not null references public.profiles (user_id) on delete cascade,
  created_from_algorithm_id text references public.discover_algorithm_variants (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'hidden', 'blocked', 'unmatched')),
  matched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  matched_on_feed_type text check (matched_on_feed_type in ('for-you', 'nearby')),
  context jsonb not null default '{}'::jsonb,
  constraint match_pairs_users_distinct check (user_one_id <> user_two_id)
);

create unique index if not exists match_pairs_unique_pair_idx
  on public.match_pairs (
    least(user_one_id, user_two_id),
    greatest(user_one_id, user_two_id)
  );

create index if not exists match_pairs_user_one_status_idx
  on public.match_pairs (user_one_id, status, matched_at desc);

create index if not exists match_pairs_user_two_status_idx
  on public.match_pairs (user_two_id, status, matched_at desc);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match_pairs (id) on delete cascade,
  actor_user_id uuid not null references public.profiles (user_id) on delete cascade,
  event_type text not null check (event_type in ('created', 'unmatched', 'hidden', 'restored', 'blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists match_events_match_created_idx
  on public.match_events (match_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Utility triggers
-- ---------------------------------------------------------------------------

drop trigger if exists trg_discover_algorithm_variants_updated_at on public.discover_algorithm_variants;
create trigger trg_discover_algorithm_variants_updated_at
  before update on public.discover_algorithm_variants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_discover_algorithm_assignments_updated_at on public.discover_algorithm_assignments;
create trigger trg_discover_algorithm_assignments_updated_at
  before update on public.discover_algorithm_assignments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_match_pairs_updated_at on public.match_pairs;
create trigger trg_match_pairs_updated_at
  before update on public.match_pairs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Recommended starter algorithms
-- ---------------------------------------------------------------------------

insert into public.discover_algorithm_variants (
  id,
  feed_type,
  name,
  code,
  description,
  is_active,
  is_default,
  score_weights
)
values
(
  'INDEX_MY_INDEX',
  'for-you',
  'Swipe Index',
  'INDEX_MY_INDEX',
  'Balances intent signals, recency, profile quality and interest overlap for endless feed depth.',
  true,
  true,
  '{
    "interest_overlap": 0.26,
    "distance": 0.12,
    "vibe_score": 0.16,
    "liked_you": 0.22,
    "recency_decay": 0.14,
    "verified_boost": 0.06,
    "engagement_quality": 0.04
  }'::jsonb
),
(
  'COMMON_GROUND',
  'nearby',
  'Affinity & Proximity',
  'COMMON_GROUND',
  'Emphasizes distance and compatibility for nearby discovery.',
  true,
  true,
  '{
    "interest_overlap": 0.20,
    "distance": 0.42,
    "vibe_score": 0.12,
    "liked_you": 0.16,
    "recency_decay": 0.06,
    "verified_boost": 0.02,
    "engagement_quality": 0.02
  }'::jsonb
),
(
  'SPARK_COMPANIONS',
  'for-you',
  'Engagement Companion AI',
  'SPARK_COMPANIONS',
  'Cold-start support variant that prioritizes likely two-way interactions.',
  true,
  false,
  '{
    "interest_overlap": 0.28,
    "distance": 0.10,
    "vibe_score": 0.12,
    "liked_you": 0.30,
    "recency_decay": 0.10,
    "verified_boost": 0.04,
    "engagement_quality": 0.06
  }'::jsonb
)
on conflict (id) do update
set
  feed_type = excluded.feed_type,
  name = excluded.name,
  code = excluded.code,
  description = excluded.description,
  is_active = excluded.is_active,
  score_weights = excluded.score_weights,
  updated_at = now();

-- Keep default uniqueness deterministic.
update public.discover_algorithm_variants
set is_default = true
where id in ('INDEX_MY_INDEX', 'COMMON_GROUND');

update public.discover_algorithm_variants
set is_default = false
where id = 'SPARK_COMPANIONS';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.discover_algorithm_variants enable row level security;
alter table public.discover_algorithm_assignments enable row level security;
alter table public.discover_feed_sessions enable row level security;
alter table public.discover_feed_impressions enable row level security;
alter table public.discover_swipe_events enable row level security;
alter table public.match_pairs enable row level security;
alter table public.match_events enable row level security;

drop policy if exists "Discover algorithms readable by authenticated" on public.discover_algorithm_variants;
create policy "Discover algorithms readable by authenticated"
  on public.discover_algorithm_variants for select
  using (auth.role() = 'authenticated' and is_active = true);

drop policy if exists "Discover assignments readable by owner" on public.discover_algorithm_assignments;
create policy "Discover assignments readable by owner"
  on public.discover_algorithm_assignments for select
  using (auth.uid() = user_id);

drop policy if exists "Discover assignments updatable by owner" on public.discover_algorithm_assignments;
create policy "Discover assignments updatable by owner"
  on public.discover_algorithm_assignments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Discover sessions manageable by owner" on public.discover_feed_sessions;
create policy "Discover sessions manageable by owner"
  on public.discover_feed_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Discover impressions manageable by actor" on public.discover_feed_impressions;
create policy "Discover impressions manageable by actor"
  on public.discover_feed_impressions for all
  using (auth.uid() = actor_user_id)
  with check (auth.uid() = actor_user_id);

drop policy if exists "Discover swipe events manageable by actor" on public.discover_swipe_events;
create policy "Discover swipe events manageable by actor"
  on public.discover_swipe_events for all
  using (auth.uid() = actor_user_id)
  with check (auth.uid() = actor_user_id);

drop policy if exists "Discover swipe inbound likes readable by target" on public.discover_swipe_events;
create policy "Discover swipe inbound likes readable by target"
  on public.discover_swipe_events for select
  using (
    auth.uid() = target_user_id
    and action in ('like', 'super_like')
    and is_active = true
  );

drop policy if exists "Match pairs visible to participants" on public.match_pairs;
create policy "Match pairs visible to participants"
  on public.match_pairs for select
  using (auth.uid() = user_one_id or auth.uid() = user_two_id);

drop policy if exists "Match pairs writable by participants" on public.match_pairs;
create policy "Match pairs writable by participants"
  on public.match_pairs for all
  using (auth.uid() = user_one_id or auth.uid() = user_two_id)
  with check (auth.uid() = user_one_id or auth.uid() = user_two_id);

drop policy if exists "Match events visible to participants" on public.match_events;
create policy "Match events visible to participants"
  on public.match_events for select
  using (
    exists (
      select 1
      from public.match_pairs mp
      where mp.id = match_events.match_id
        and (mp.user_one_id = auth.uid() or mp.user_two_id = auth.uid())
    )
  );

drop policy if exists "Match events insertable by participants" on public.match_events;
create policy "Match events insertable by participants"
  on public.match_events for insert
  with check (
    auth.uid() = actor_user_id
    and exists (
      select 1
      from public.match_pairs mp
      where mp.id = match_events.match_id
        and (mp.user_one_id = auth.uid() or mp.user_two_id = auth.uid())
    )
  );

notify pgrst, 'reload schema';
