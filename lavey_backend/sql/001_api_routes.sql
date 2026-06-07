-- Lavey API route registry
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.api_routes (
  id uuid primary key default gen_random_uuid(),
  method text not null check (method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  path_pattern text not null,
  handler_key text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (method, path_pattern)
);

create index if not exists api_routes_active_idx on public.api_routes (is_active);

alter table public.api_routes enable row level security;

drop policy if exists "Public read api routes" on public.api_routes;
create policy "Public read api routes"
  on public.api_routes
  for select
  using (is_active = true);

-- Replace seed rows on re-run (safe for development)
delete from public.api_routes;

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('GET',  '/health',                              'system.health',           'Health check'),
  ('GET',  '/meta/routes',                         'meta.listRoutes',         'List registered API routes from database'),
  ('GET',  '/auth/google',                         'auth.startGoogleOAuth',   'Start Google sign-in (redirect)'),
  ('GET',  '/auth/google/callback',                'auth.googleOAuthCallback','Google OAuth callback'),
  ('POST', '/auth/google',                         'auth.signInWithGoogleToken','Sign in with Google ID token'),
  ('GET',  '/auth/me',                             'auth.getCurrentUser',     'Get current authenticated user'),
  ('POST', '/auth/logout',                         'auth.logout',             'Sign out'),
  ('POST', '/auth/login',                          'auth.login',              'Email sign-in'),
  ('POST', '/auth/register',                       'auth.register',           'Email sign-up'),
  ('POST', '/auth/verify-email',                   'auth.verifyEmail',        'Verify email with OTP code'),
  ('POST', '/auth/resend-verification',            'auth.resendVerification', 'Resend email verification code'),
  ('GET',  '/profiles/discover',                   'profiles.getDiscoverFeed','Discover feed'),
  ('GET',  '/profiles/:id',                        'profiles.getProfileById', 'Profile by id'),
  ('GET',  '/users/me',                            'users.getMyProfile',      'Current user profile'),
  ('PATCH','/users/me/location',                   'users.updateMyLocation',  'Update current user location'),
  ('GET',  '/subscription/flame-quota',            'subscription.getFlameQuota','Flame quota'),
  ('GET',  '/messages/conversations',              'messages.getConversations','Conversation list'),
  ('GET',  '/messages/conversations/:id',          'messages.getThread',      'Conversation thread'),
  ('DELETE','/messages/conversations/:id',         'messages.deleteConversation','Delete conversation (planned)'),
  ('PATCH','/messages/conversations/:conversationId/messages/:messageId', 'messages.setMessageReaction', 'Set or clear emoji reaction on a chat message'),
  ('DELETE','/messages/conversations/:conversationId/messages/:messageId', 'messages.deleteMessage', 'Delete message (planned)'),
  ('POST', '/matches/flame',                       'matches.sendFlame',       'Send flame (planned)'),
  ('GET',  '/matches',                             'matches.list',            'List matches (planned)'),
  ('GET',  '/rooms/vibe-check',                    'rooms.list',              'List vibe check meetups'),
  ('POST', '/rooms/vibe-check/:id/join',           'rooms.join',              'Join vibe check meetup'),
  ('GET',  '/dates/invites',                       'dates.listInvites',       'List meetup invites'),
  ('POST', '/dates/join-by-code',                  'dates.joinByCode',        'Join meetup by access code'),
  ('POST', '/dates',                               'dates.create',            'Create meetup'),
  ('POST', '/dates/invites/:id',                   'dates.respondInvite',     'Accept or decline meetup invite'),
  ('POST', '/users/me/onboarding',                   'users.submitOnboarding',  'Save onboarding quiz answers'),
  ('GET',  '/users/me/posts',                         'content.listMyPosts',     'List current user posts'),
  ('POST', '/users/me/posts',                         'content.createPost',      'Upload profile photo or video clip'),
  ('PATCH','/users/me/posts/:id',                     'content.updatePost',      'Update post visibility'),
  ('DELETE','/users/me/posts/:id',                     'content.deletePost',      'Delete profile post'),
  ('POST', '/users/me/avatar',                         'content.uploadAvatar',    'Upload profile avatar'),
  ('POST', '/gifts',                               'gifts.send',              'Send gift (planned)');
