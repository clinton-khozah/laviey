-- ============================================================================
-- Admin accounts (email/password) for dashboard auth
-- Run after 001. Backend uses service role; no public access.
-- ============================================================================

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  constraint admin_accounts_email_unique unique (email),
  constraint admin_accounts_email_lowercase check (email = lower(email))
);

comment on table public.admin_accounts is 'Lavey admin dashboard operators (hashed passwords, JWT auth via API).';

alter table public.admin_accounts enable row level security;

drop policy if exists admin_accounts_no_public on public.admin_accounts;
create policy admin_accounts_no_public on public.admin_accounts
  for all
  using (false)
  with check (false);

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('POST', '/admin/auth/register', 'admin.register', 'Create admin account (invite code after bootstrap)'),
  ('POST', '/admin/auth/login', 'admin.login', 'Admin email/password sign-in'),
  ('GET', '/admin/auth/me', 'admin.me', 'Current admin session')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;

notify pgrst, 'reload schema';
