-- ============================================================================
-- Profile content (photos & 10s clips) stored in Supabase Storage bucket "content"
-- Max file size: 3 MB (matches bucket limit)
-- Run after 003_profile_schema.sql
-- ============================================================================

create extension if not exists pgcrypto;

-- Ensure bucket exists with 3 MB limit and public read for discover/profile URLs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content',
  'content',
  true,
  3145728,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- profile_posts — metadata for discover + profile grid
-- Storage layout:
--   users/{user_id}/avatar/main.webp
--   users/{user_id}/posts/{post_id}/media.{ext}
--   users/{user_id}/posts/{post_id}/poster.webp   (video thumbnail)
-- ---------------------------------------------------------------------------

create table if not exists public.profile_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  storage_path text not null,
  poster_path text,
  public_url text not null,
  poster_url text,
  caption text not null default '' check (char_length(caption) <= 120),
  tags text[] not null default '{}',
  duration_sec smallint check (duration_sec is null or (duration_sec >= 1 and duration_sec <= 60)),
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 3145728),
  mime_type text not null,
  sort_order smallint not null default 1 check (sort_order > 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_posts_storage_path_unique unique (storage_path)
);

create index if not exists profile_posts_user_sort_idx
  on public.profile_posts (user_id, sort_order, created_at desc);

create index if not exists profile_posts_discover_idx
  on public.profile_posts (is_visible, created_at desc)
  where is_visible = true;

comment on table public.profile_posts is 'User photos and short video clips; binary files live in storage bucket content.';

-- Enforce max 5 posts per user at the database level
create or replace function public.enforce_profile_post_limit()
returns trigger
language plpgsql
as $$
declare
  post_count integer;
begin
  select count(*)::integer into post_count
  from public.profile_posts
  where user_id = new.user_id;

  if post_count >= 5 then
    raise exception 'PROFILE_POST_LIMIT' using
      message = 'A profile may have at most 5 posts';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profile_posts_limit on public.profile_posts;
create trigger trg_profile_posts_limit
  before insert on public.profile_posts
  for each row
  execute function public.enforce_profile_post_limit();

drop trigger if exists trg_profile_posts_updated_at on public.profile_posts;
create trigger trg_profile_posts_updated_at
  before update on public.profile_posts
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profile_posts enable row level security;

drop policy if exists "Profile posts readable by owner" on public.profile_posts;
create policy "Profile posts readable by owner"
  on public.profile_posts for select
  using (auth.uid() = user_id);

drop policy if exists "Profile posts readable when public" on public.profile_posts;
create policy "Profile posts readable when public"
  on public.profile_posts for select
  using (
    is_visible = true
    and exists (
      select 1
      from public.profiles p
      where p.user_id = profile_posts.user_id
        and p.show_on_discover = true
    )
  );

drop policy if exists "Profile posts insertable by owner" on public.profile_posts;
create policy "Profile posts insertable by owner"
  on public.profile_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Profile posts updatable by owner" on public.profile_posts;
create policy "Profile posts updatable by owner"
  on public.profile_posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Profile posts deletable by owner" on public.profile_posts;
create policy "Profile posts deletable by owner"
  on public.profile_posts for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage policies — public read, owner write under users/{auth.uid()}/...
-- ---------------------------------------------------------------------------

drop policy if exists "content_public_read" on storage.objects;
create policy "content_public_read"
  on storage.objects for select
  using (bucket_id = 'content');

drop policy if exists "content_owner_insert" on storage.objects;
create policy "content_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'content'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "content_owner_update" on storage.objects;
create policy "content_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'content'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "content_owner_delete" on storage.objects;
create policy "content_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'content'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
