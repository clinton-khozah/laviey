-- ============================================================================
-- Online video meetups (public rooms + private match invites)
-- Run after 008_discover_matching_engine.sql
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Meetups
-- ---------------------------------------------------------------------------

create table if not exists public.online_meetups (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles (user_id) on delete cascade,
  title text not null,
  topic text not null default '',
  visibility text not null check (visibility in ('public', 'private')),
  access_code text not null,
  starts_at timestamptz not null,
  max_participants smallint not null default 24 check (max_participants between 2 and 100),
  participant_count smallint not null default 0 check (participant_count >= 0),
  cover_image_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_meetups_title_length check (char_length(title) between 1 and 120),
  constraint online_meetups_topic_length check (char_length(topic) <= 240)
);

create unique index if not exists online_meetups_access_code_idx
  on public.online_meetups (upper(access_code));

create index if not exists online_meetups_host_created_idx
  on public.online_meetups (host_user_id, created_at desc);

create index if not exists online_meetups_public_starts_idx
  on public.online_meetups (visibility, starts_at desc)
  where visibility = 'public';

-- ---------------------------------------------------------------------------
-- Private meetup invites (match-only)
-- ---------------------------------------------------------------------------

create table if not exists public.online_meetup_invites (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.online_meetups (id) on delete cascade,
  host_user_id uuid not null references public.profiles (user_id) on delete cascade,
  invitee_user_id uuid not null references public.profiles (user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint online_meetup_invites_distinct check (host_user_id <> invitee_user_id),
  unique (meetup_id, invitee_user_id)
);

create index if not exists online_meetup_invites_invitee_status_idx
  on public.online_meetup_invites (invitee_user_id, status, created_at desc);

create index if not exists online_meetup_invites_meetup_idx
  on public.online_meetup_invites (meetup_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists trg_online_meetups_updated_at on public.online_meetups;
create trigger trg_online_meetups_updated_at
  before update on public.online_meetups
  for each row execute function public.set_updated_at();

drop trigger if exists trg_online_meetup_invites_updated_at on public.online_meetup_invites;
create trigger trg_online_meetup_invites_updated_at
  before update on public.online_meetup_invites
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.online_meetups enable row level security;
alter table public.online_meetup_invites enable row level security;

drop policy if exists "Public meetups are readable" on public.online_meetups;
create policy "Public meetups are readable"
  on public.online_meetups
  for select
  using (
    visibility = 'public'
    or host_user_id = auth.uid()
    or exists (
      select 1
      from public.online_meetup_invites i
      where i.meetup_id = online_meetups.id
        and i.invitee_user_id = auth.uid()
        and i.status = 'accepted'
    )
  );

drop policy if exists "Users create own meetups" on public.online_meetups;
create policy "Users create own meetups"
  on public.online_meetups
  for insert
  with check (host_user_id = auth.uid());

drop policy if exists "Hosts update own meetups" on public.online_meetups;
create policy "Hosts update own meetups"
  on public.online_meetups
  for update
  using (host_user_id = auth.uid())
  with check (host_user_id = auth.uid());

drop policy if exists "Meetup invites visible to host or invitee" on public.online_meetup_invites;
create policy "Meetup invites visible to host or invitee"
  on public.online_meetup_invites
  for select
  using (host_user_id = auth.uid() or invitee_user_id = auth.uid());

drop policy if exists "Hosts create meetup invites" on public.online_meetup_invites;
create policy "Hosts create meetup invites"
  on public.online_meetup_invites
  for insert
  with check (host_user_id = auth.uid());

drop policy if exists "Invitees respond to invites" on public.online_meetup_invites;
create policy "Invitees respond to invites"
  on public.online_meetup_invites
  for update
  using (invitee_user_id = auth.uid())
  with check (invitee_user_id = auth.uid());

comment on table public.online_meetups is 'Video meetup rooms — public (code-only) or private (match invite).';
comment on table public.online_meetup_invites is '1-on-1 private meetup invites; code unlocks after accept.';
