-- Platinum subscription catalog (plans, features, marketing copy)
-- Run in Supabase SQL Editor AFTER prior migrations.

create table if not exists public.platinum_catalog (
  id smallint primary key default 1 check (id = 1),
  sheet_title text not null default 'Platinum',
  hero_title text not null default 'Go Platinum',
  hero_tagline text not null,
  star_emoji text not null default '★',
  one_time_fine_print text not null,
  recurring_fine_print text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.platinum_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  label text not null,
  price_display text not null,
  period_display text not null,
  badge text,
  is_popular boolean not null default false,
  is_default boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.platinum_features (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  title text not null,
  description text not null,
  icon_key text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists platinum_plans_active_sort_idx
  on public.platinum_plans (is_active, sort_order);

create index if not exists platinum_features_active_sort_idx
  on public.platinum_features (is_active, sort_order);

alter table public.platinum_catalog enable row level security;
alter table public.platinum_plans enable row level security;
alter table public.platinum_features enable row level security;

drop policy if exists "Public read platinum catalog" on public.platinum_catalog;
create policy "Public read platinum catalog"
  on public.platinum_catalog for select
  using (is_active = true);

drop policy if exists "Public read platinum plans" on public.platinum_plans;
create policy "Public read platinum plans"
  on public.platinum_plans for select
  using (is_active = true);

drop policy if exists "Public read platinum features" on public.platinum_features;
create policy "Public read platinum features"
  on public.platinum_features for select
  using (is_active = true);

-- Reseed catalog (development-safe)
delete from public.platinum_features;
delete from public.platinum_plans;
delete from public.platinum_catalog;

insert into public.platinum_catalog (
  id,
  sheet_title,
  hero_title,
  hero_tagline,
  one_time_fine_print,
  recurring_fine_print
) values (
  1,
  'Platinum',
  'Go Platinum',
  'Match faster, see who''s into you, and stand out every week on Lavey.',
  'One-time access for 24 hours. No auto-renew in demo.',
  'Recurring billing. Cancel anytime in Settings. Free trial not available in demo.'
);

insert into public.platinum_plans (plan_key, label, price_display, period_display, badge, is_popular, is_default, sort_order) values
  ('day', '1 day', '$2.99', 'one-time', null, false, false, 1),
  ('week', 'Weekly', '$6.99', '/ week', 'Try it', false, false, 2),
  ('month', 'Monthly', '$14.99', '/ month', 'Most popular', true, true, 3);

insert into public.platinum_features (feature_key, title, description, icon_key, sort_order) values
  ('likes', 'See who liked you', 'Unlock every like — names, photos, and vibe scores. No more guessing.', 'likes', 1),
  ('crushes', 'Unlimited daily crushes', 'Send as many likes as you want. Never hit the daily limit again.', 'crushes', 2),
  ('views', 'See who viewed your vibes', 'Know who watched your clips and how often they came back.', 'views', 3),
  ('filters', 'Advanced discovery filters', 'Filter by age, distance, and who you want to meet.', 'filters', 4),
  ('ai', '1 AI profile review / month', 'Get tips on photos, bio, and vibes so you match with the right people.', 'ai', 5),
  ('spotlight', 'Weekly profile spotlight', 'Jump to the top of For You once a week and get seen first.', 'spotlight', 6),
  ('ecoffee', 'Unlimited E-Coffee', 'Send as many virtual coffees as you want to start conversations.', 'ecoffee', 7),
  ('rewind', 'Rewind last pass', 'Accidentally skipped someone? Bring them back with one tap.', 'rewind', 8);

insert into public.api_routes (method, path_pattern, handler_key, description)
values ('GET', '/subscription/platinum', 'subscription.getPlatinumCatalog', 'Platinum plans, features, and marketing copy')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;
