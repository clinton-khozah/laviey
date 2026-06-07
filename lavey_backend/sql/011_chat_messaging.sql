-- ============================================================================
-- Match chat (WhatsApp-style) — conversations, messages, typing, presence
-- Run after 008_discover_matching_engine.sql
-- ============================================================================

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.match_pairs') is null then
    raise exception 'Run sql/008_discover_matching_engine.sql first — public.match_pairs is missing.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.match_pairs (id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_conversations_last_message_idx
  on public.chat_conversations (last_message_at desc nulls last);

create table if not exists public.chat_participant_state (
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  last_read_at timestamptz,
  is_pinned boolean not null default false,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  sender_user_id uuid not null references public.profiles (user_id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at asc);

create table if not exists public.chat_typing_signals (
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  is_typing boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.chat_user_presence (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  last_active_at timestamptz not null default now()
);

comment on table public.chat_conversations is 'One chat thread per active match pair.';
comment on table public.chat_messages is 'Text messages between matched users.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_in_conversation(conv_id uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_conversations c
    join public.match_pairs mp on mp.id = c.match_id
    where c.id = conv_id
      and mp.status = 'active'
      and (mp.user_one_id = uid or mp.user_two_id = uid)
  );
$$;

create or replace function public.init_chat_participant_states()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  u1 uuid;
  u2 uuid;
begin
  select mp.user_one_id, mp.user_two_id
  into u1, u2
  from public.match_pairs mp
  where mp.id = new.match_id;

  if u1 is not null then
    insert into public.chat_participant_state (conversation_id, user_id)
    values (new.id, u1), (new.id, u2)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_chat_conversations_init_participants on public.chat_conversations;
create trigger trg_chat_conversations_init_participants
  after insert on public.chat_conversations
  for each row
  execute function public.init_chat_participant_states();

create or replace function public.touch_chat_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 120),
    updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_chat_messages_touch_conversation on public.chat_messages;
create trigger trg_chat_messages_touch_conversation
  after insert on public.chat_messages
  for each row
  execute function public.touch_chat_conversation_on_message();

-- Backfill conversations for existing active matches
insert into public.chat_conversations (match_id)
select mp.id
from public.match_pairs mp
where mp.status = 'active'
  and not exists (
    select 1 from public.chat_conversations c where c.match_id = mp.id
  );

-- Ensure participant rows exist for backfilled conversations
insert into public.chat_participant_state (conversation_id, user_id)
select c.id, mp.user_one_id
from public.chat_conversations c
join public.match_pairs mp on mp.id = c.match_id
on conflict do nothing;

insert into public.chat_participant_state (conversation_id, user_id)
select c.id, mp.user_two_id
from public.chat_conversations c
join public.match_pairs mp on mp.id = c.match_id
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.chat_conversations enable row level security;
alter table public.chat_participant_state enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_typing_signals enable row level security;
alter table public.chat_user_presence enable row level security;

drop policy if exists "Chat conversations readable by match members" on public.chat_conversations;
create policy "Chat conversations readable by match members"
  on public.chat_conversations for select
  to authenticated
  using (public.user_in_conversation(id));

drop policy if exists "Chat conversations insertable for active matches" on public.chat_conversations;
create policy "Chat conversations insertable for active matches"
  on public.chat_conversations for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.match_pairs mp
      where mp.id = match_id
        and mp.status = 'active'
        and (mp.user_one_id = auth.uid() or mp.user_two_id = auth.uid())
    )
  );

drop policy if exists "Chat conversations updatable by members" on public.chat_conversations;
create policy "Chat conversations updatable by members"
  on public.chat_conversations for update
  to authenticated
  using (public.user_in_conversation(id))
  with check (public.user_in_conversation(id));

drop policy if exists "Chat participant state readable by member" on public.chat_participant_state;
create policy "Chat participant state readable by member"
  on public.chat_participant_state for select
  to authenticated
  using (public.user_in_conversation(conversation_id));

drop policy if exists "Chat participant state updatable by owner" on public.chat_participant_state;
create policy "Chat participant state updatable by owner"
  on public.chat_participant_state for update
  to authenticated
  using (user_id = auth.uid() and public.user_in_conversation(conversation_id))
  with check (user_id = auth.uid() and public.user_in_conversation(conversation_id));

drop policy if exists "Chat messages readable by members" on public.chat_messages;
create policy "Chat messages readable by members"
  on public.chat_messages for select
  to authenticated
  using (public.user_in_conversation(conversation_id));

drop policy if exists "Chat messages insertable by members" on public.chat_messages;
create policy "Chat messages insertable by members"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_user_id = auth.uid()
    and public.user_in_conversation(conversation_id)
  );

drop policy if exists "Chat typing readable by members" on public.chat_typing_signals;
create policy "Chat typing readable by members"
  on public.chat_typing_signals for select
  to authenticated
  using (public.user_in_conversation(conversation_id));

drop policy if exists "Chat typing upsertable by owner" on public.chat_typing_signals;
create policy "Chat typing upsertable by owner"
  on public.chat_typing_signals for all
  to authenticated
  using (user_id = auth.uid() and public.user_in_conversation(conversation_id))
  with check (user_id = auth.uid() and public.user_in_conversation(conversation_id));

drop policy if exists "Chat presence readable by authenticated" on public.chat_user_presence;
create policy "Chat presence readable by authenticated"
  on public.chat_user_presence for select
  to authenticated
  using (true);

drop policy if exists "Chat presence upsertable by owner" on public.chat_user_presence;
create policy "Chat presence upsertable by owner"
  on public.chat_user_presence for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Realtime (Supabase)
alter table public.chat_messages replica identity full;
alter table public.chat_typing_signals replica identity full;
alter table public.chat_user_presence replica identity full;
alter table public.chat_conversations replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_messages;
    alter publication supabase_realtime add table public.chat_typing_signals;
    alter publication supabase_realtime add table public.chat_user_presence;
    alter publication supabase_realtime add table public.chat_conversations;
  end if;
exception
  when duplicate_object then null;
  when others then
    raise notice 'Realtime publication skipped (tables still created): %', sqlerrm;
end $$;

notify pgrst, 'reload schema';
