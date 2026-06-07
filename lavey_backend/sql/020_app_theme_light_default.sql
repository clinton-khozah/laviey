-- Default new profiles to light mode (appearance)
alter table public.profiles
  alter column app_theme set default 'light';

-- Existing accounts were seeded with night as the old default
update public.profiles
  set app_theme = 'light'
  where app_theme = 'night';

notify pgrst, 'reload schema';
