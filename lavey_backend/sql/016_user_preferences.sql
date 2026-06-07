-- ============================================================================
-- User app preferences (settings sheet)
-- Run in Supabase SQL Editor after 015_user_privacy.sql
-- ============================================================================

alter table public.profiles add column if not exists app_theme text not null default 'light'
  check (app_theme in ('night', 'light'));

alter table public.profiles add column if not exists chat_typing_style text not null default 'romantic'
  check (chat_typing_style in ('romantic', 'classic', 'neon', 'minimal'));

alter table public.profiles add column if not exists app_language text not null default 'en'
  check (app_language in ('en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'));

alter table public.profiles add column if not exists push_notifications_enabled boolean not null default true;

comment on column public.profiles.app_theme is 'Appearance: night or light.';
comment on column public.profiles.chat_typing_style is 'Chat bubble / typing style preset.';
comment on column public.profiles.app_language is 'UI language code.';
comment on column public.profiles.push_notifications_enabled is 'Whether push alerts are enabled.';

insert into public.api_routes (method, path_pattern, handler_key, description) values
  ('GET',   '/users/me/settings', 'users.getSettings',    'Get app preferences'),
  ('PATCH', '/users/me/settings', 'users.updateSettings', 'Update app preferences'),
  ('POST',  '/auth/change-password', 'auth.changePassword', 'Change account password')
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;
