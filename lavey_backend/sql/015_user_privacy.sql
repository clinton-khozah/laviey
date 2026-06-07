-- ============================================================================
-- User privacy, blocks, contact matching, read-receipt visibility
-- Run in Supabase SQL Editor after 003_profile_schema.sql
-- ============================================================================

-- Profile privacy flags (show_on_discover already exists in 003)
alter table public.profiles add column if not exists read_receipts_enabled boolean not null default true;
alter table public.profiles add column if not exists contacts_can_find_me boolean not null default false;
alter table public.profiles add column if not exists phone_hash text;

create index if not exists profiles_phone_hash_idx
  on public.profiles (phone_hash)
  where phone_hash is not null and contacts_can_find_me = true;

comment on column public.profiles.read_receipts_enabled is 'When false, matches cannot see when this user read messages.';
comment on column public.profiles.contacts_can_find_me is 'When true and phone_hash is set, contact importers may discover this profile.';
comment on column public.profiles.phone_hash is 'SHA-256 hash of normalized phone — never store raw numbers.';

-- Read receipt timestamp (separate from last_read_at used for unread badges)
alter table public.chat_participant_state add column if not exists read_receipt_at timestamptz;

comment on column public.chat_participant_state.read_receipt_at is
  'Exposed to matches for delivery ticks; only updated when read_receipts_enabled is true.';

-- ---------------------------------------------------------------------------
-- Blocked users (independent of match status)
-- ---------------------------------------------------------------------------

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.profiles (user_id) on delete cascade,
  blocked_user_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_distinct check (blocker_user_id <> blocked_user_id),
  unique (blocker_user_id, blocked_user_id)
);

create index if not exists user_blocks_blocker_idx
  on public.user_blocks (blocker_user_id, created_at desc);

alter table public.user_blocks enable row level security;

drop policy if exists "Users manage own blocks" on public.user_blocks;
create policy "Users manage own blocks"
  on public.user_blocks
  for all
  using (blocker_user_id = auth.uid())
  with check (blocker_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Imported contact phone hashes (for friend discovery)
-- ---------------------------------------------------------------------------

create table if not exists public.user_imported_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  phone_hash text not null,
  created_at timestamptz not null default now(),
  unique (user_id, phone_hash)
);

create index if not exists user_imported_contacts_user_idx
  on public.user_imported_contacts (user_id);

alter table public.user_imported_contacts enable row level security;

drop policy if exists "Users manage own imported contacts" on public.user_imported_contacts;
create policy "Users manage own imported contacts"
  on public.user_imported_contacts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- API route registry
-- ---------------------------------------------------------------------------

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('GET',    '/users/me/privacy',              'users.getPrivacySettings',     'Get privacy & safety settings'),
  ('PATCH',  '/users/me/privacy',              'users.updatePrivacySettings',  'Update privacy & safety settings'),
  ('GET',    '/users/me/blocked',              'users.listBlockedUsers',       'List blocked users'),
  ('POST',   '/users/me/blocked/:userId',      'users.blockUser',              'Block a user'),
  ('DELETE', '/users/me/blocked/:userId',      'users.unblockUser',            'Unblock a user'),
  ('POST',   '/users/me/contacts/import',      'users.importContacts',         'Import hashed phone contacts'),
  ('GET',    '/users/me/data-export',          'users.exportMyData',           'Download account data export'),
  ('DELETE', '/users/me',                      'users.deleteAccount',          'Permanently delete account')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;
