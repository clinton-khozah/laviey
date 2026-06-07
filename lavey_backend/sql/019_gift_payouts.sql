-- ============================================================================
-- Gift earnings — payout banks, withdrawal methods, user accounts & requests
-- Run after 003_profile_schema.sql
-- ============================================================================

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists gift_withdraw_enabled boolean not null default true;

-- ---------------------------------------------------------------------------
-- Catalog (public read)
-- ---------------------------------------------------------------------------

create table if not exists public.payout_banks (
  id text primary key,
  name text not null,
  logo_url text not null,
  country_code text not null default 'US',
  sort_order smallint not null default 1 check (sort_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawal_methods (
  id text primary key,
  label text not null,
  description text not null default '',
  processing_time text not null default '3–5 business days',
  min_amount_cents integer not null default 1000 check (min_amount_cents >= 0),
  sort_order smallint not null default 1 check (sort_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.withdrawal_methods (id, label, description, processing_time, min_amount_cents, sort_order) values
  ('bank_transfer', 'Bank transfer', 'Standard ACH or EFT to your linked account', '3–5 business days', 1000, 1),
  ('instant_eft', 'Instant EFT', 'Same-day payout where supported (South Africa)', 'Same business day', 1000, 2)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  processing_time = excluded.processing_time,
  min_amount_cents = excluded.min_amount_cents,
  is_active = true;

insert into public.payout_banks (id, name, logo_url, country_code, sort_order) values
  ('chase', 'Chase', '/bank-logos/chase.svg', 'US', 1),
  ('bank-of-america', 'Bank of America', '/bank-logos/bank-of-america.svg', 'US', 2),
  ('wells-fargo', 'Wells Fargo', '/bank-logos/wells-fargo.svg', 'US', 3),
  ('capitec', 'Capitec', '/bank-logos/capitec.svg', 'ZA', 4),
  ('fnb', 'FNB', '/bank-logos/fnb.svg', 'ZA', 5),
  ('standard-bank', 'Standard Bank', '/bank-logos/standard-bank.svg', 'ZA', 6),
  ('nedbank', 'Nedbank', '/bank-logos/nedbank.svg', 'ZA', 7),
  ('absa', 'Absa', '/bank-logos/absa.svg', 'ZA', 8)
on conflict (id) do update set
  name = excluded.name,
  logo_url = excluded.logo_url,
  country_code = excluded.country_code,
  sort_order = excluded.sort_order,
  is_active = true;

-- ---------------------------------------------------------------------------
-- User payout account & withdrawal requests
-- ---------------------------------------------------------------------------

create table if not exists public.user_payout_accounts (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  withdrawal_method_id text not null references public.withdrawal_methods (id),
  payout_bank_id text references public.payout_banks (id),
  account_holder text not null check (char_length(trim(account_holder)) > 0),
  account_number text not null check (char_length(trim(account_number)) >= 4),
  account_type text not null default 'checking' check (account_type in ('checking', 'savings')),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  withdrawal_method_id text not null references public.withdrawal_methods (id),
  payout_bank_id text references public.payout_banks (id),
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  account_mask text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gift_withdrawals_user_status_idx
  on public.gift_withdrawals (user_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.payout_banks enable row level security;
alter table public.withdrawal_methods enable row level security;
alter table public.user_payout_accounts enable row level security;
alter table public.gift_withdrawals enable row level security;

drop policy if exists "Public read payout banks" on public.payout_banks;
create policy "Public read payout banks"
  on public.payout_banks for select using (is_active = true);

drop policy if exists "Public read withdrawal methods" on public.withdrawal_methods;
create policy "Public read withdrawal methods"
  on public.withdrawal_methods for select using (is_active = true);

drop policy if exists "Users manage own payout account" on public.user_payout_accounts;
create policy "Users manage own payout account"
  on public.user_payout_accounts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users read own withdrawals" on public.gift_withdrawals;
create policy "Users read own withdrawals"
  on public.gift_withdrawals for select
  using (user_id = auth.uid());

drop policy if exists "Users insert own withdrawals" on public.gift_withdrawals;
create policy "Users insert own withdrawals"
  on public.gift_withdrawals for insert
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- API routes
-- ---------------------------------------------------------------------------

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('GET',  '/gifts/payout-catalog',           'gifts.payoutCatalog',    'Payout banks and withdrawal methods'),
  ('GET',  '/users/me/gifts/wallet',          'gifts.getWallet',        'Gift earnings wallet summary'),
  ('PUT',  '/users/me/gifts/payout-account',  'gifts.savePayoutAccount','Save linked bank account'),
  ('POST', '/users/me/gifts/withdraw',        'gifts.requestWithdraw',  'Request gift earnings withdrawal')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;

notify pgrst, 'reload schema';
