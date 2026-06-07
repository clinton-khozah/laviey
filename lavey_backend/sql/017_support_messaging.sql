-- ============================================================================
-- Lavey Support — user help desk + admin inbox
-- Run after 012_admin_users.sql and 003_profile_schema.sql
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Config & quick topics (served to the app)
-- ---------------------------------------------------------------------------

create table if not exists public.support_config (
  id text primary key default 'default',
  welcome_message text not null default 'Hi! 👋 We''re the Lavey team. Tell us what''s going on — we usually reply within a few hours.',
  auto_reply_message text not null default 'Thanks for reaching out. A member of our team has received your message and will get back to you at the email on your account, usually within a few hours.',
  support_display_name text not null default 'Lavey Support',
  support_status_text text not null default 'We''re here to help',
  updated_at timestamptz not null default now()
);

insert into public.support_config (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.support_quick_topics (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order smallint not null default 1 check (sort_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (label)
);

insert into public.support_quick_topics (label, sort_order) values
  ('Account help', 1),
  ('Billing & Platinum', 2),
  ('Safety or reporting', 3),
  ('Bug or app issue', 4)
on conflict (label) do update set
  sort_order = excluded.sort_order,
  is_active = true;

-- ---------------------------------------------------------------------------
-- Conversations & messages
-- ---------------------------------------------------------------------------

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (user_id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved')),
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  unread_by_admin boolean not null default true,
  auto_reply_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_conversations_status_updated_idx
  on public.support_conversations (status, last_message_at desc);

create index if not exists support_conversations_unread_idx
  on public.support_conversations (unread_by_admin, last_message_at desc)
  where unread_by_admin = true;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations (id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'system', 'admin')),
  sender_admin_id uuid references public.admin_accounts (id) on delete set null,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_conversation_created_idx
  on public.support_messages (conversation_id, created_at asc);

-- ---------------------------------------------------------------------------
-- RLS — users manage their own thread; admin uses service role
-- ---------------------------------------------------------------------------

alter table public.support_config enable row level security;
alter table public.support_quick_topics enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "Public read support config" on public.support_config;
create policy "Public read support config"
  on public.support_config for select using (true);

drop policy if exists "Public read active support topics" on public.support_quick_topics;
create policy "Public read active support topics"
  on public.support_quick_topics for select using (is_active = true);

drop policy if exists "Users manage own support conversation" on public.support_conversations;
create policy "Users manage own support conversation"
  on public.support_conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users read own support messages" on public.support_messages;
create policy "Users read own support messages"
  on public.support_messages for select
  using (
    exists (
      select 1 from public.support_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert own support messages" on public.support_messages;
create policy "Users insert own support messages"
  on public.support_messages for insert
  with check (
    sender_type = 'user'
    and exists (
      select 1 from public.support_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- API routes
-- ---------------------------------------------------------------------------

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('GET',  '/support/config',                    'support.getConfig',              'Support welcome copy and quick topics'),
  ('GET',  '/support/conversation',              'support.getConversation',        'Get or create user support thread'),
  ('POST', '/support/messages',                  'support.sendMessage',            'Send message to Lavey support'),
  ('GET',  '/admin/support/tickets',             'admin.listSupportTickets',       'List support tickets for admin'),
  ('GET',  '/admin/support/tickets/:id',         'admin.getSupportTicket',         'Support ticket thread'),
  ('POST', '/admin/support/tickets/:id/messages','admin.replySupportTicket',       'Admin reply to support ticket'),
  ('PATCH','/admin/support/tickets/:id',         'admin.updateSupportTicket',      'Update support ticket status')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;

notify pgrst, 'reload schema';
