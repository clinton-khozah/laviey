-- ============================================================================
-- Post likes — who liked which profile post; powers counts + liker lists + matches
-- Run after 007_profile_content.sql and 008_discover_matching_engine.sql
-- ============================================================================

create table if not exists public.profile_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.profile_posts (id) on delete cascade,
  liker_user_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_post_likes_unique unique (post_id, liker_user_id)
);

create index if not exists profile_post_likes_post_idx
  on public.profile_post_likes (post_id, created_at desc);

create index if not exists profile_post_likes_liker_idx
  on public.profile_post_likes (liker_user_id, created_at desc);

comment on table public.profile_post_likes is 'Likes on profile photos/clips; liker_user_id is who tapped like.';

alter table public.profile_post_likes enable row level security;

-- Anyone authenticated can like a visible discover post (not their own)
drop policy if exists "Post likes insert on visible posts" on public.profile_post_likes;
create policy "Post likes insert on visible posts"
  on public.profile_post_likes for insert
  to authenticated
  with check (
    liker_user_id = auth.uid()
    and exists (
      select 1
      from public.profile_posts pp
      join public.profiles p on p.user_id = pp.user_id
      where pp.id = post_id
        and pp.is_visible = true
        and pp.user_id <> auth.uid()
        and p.show_on_discover = true
    )
  );

-- Liker can remove their own like
drop policy if exists "Post likes delete own" on public.profile_post_likes;
create policy "Post likes delete own"
  on public.profile_post_likes for delete
  to authenticated
  using (liker_user_id = auth.uid());

-- Post owner sees everyone who liked their posts
drop policy if exists "Post likes readable by post owner" on public.profile_post_likes;
create policy "Post likes readable by post owner"
  on public.profile_post_likes for select
  to authenticated
  using (
    exists (
      select 1
      from public.profile_posts pp
      where pp.id = post_id
        and pp.user_id = auth.uid()
    )
  );

-- Liker can read their own like rows
drop policy if exists "Post likes readable by liker" on public.profile_post_likes;
create policy "Post likes readable by liker"
  on public.profile_post_likes for select
  to authenticated
  using (liker_user_id = auth.uid());

-- Authenticated users can read likes on visible discover posts (for counts / liked state)
drop policy if exists "Post likes readable on public posts" on public.profile_post_likes;
create policy "Post likes readable on public posts"
  on public.profile_post_likes for select
  to authenticated
  using (
    exists (
      select 1
      from public.profile_posts pp
      join public.profiles p on p.user_id = pp.user_id
      where pp.id = post_id
        and pp.is_visible = true
        and p.show_on_discover = true
    )
  );
