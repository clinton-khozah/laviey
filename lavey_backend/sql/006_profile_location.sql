-- ============================================================================
-- Profile location fields for proximity matching
-- Run after 003_profile_schema.sql (and 004 if applied)
-- Safe to re-run. Do NOT re-run 003 after 004 — use this file only.
-- ============================================================================

alter table public.profiles add column if not exists latitude double precision;
alter table public.profiles add column if not exists longitude double precision;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists suburb text;
alter table public.profiles add column if not exists location_updated_at timestamptz;

alter table public.profiles drop constraint if exists profiles_latitude_range;
alter table public.profiles add constraint profiles_latitude_range
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.profiles drop constraint if exists profiles_longitude_range;
alter table public.profiles add constraint profiles_longitude_range
  check (longitude is null or (longitude >= -180 and longitude <= 180));

alter table public.profiles drop constraint if exists profiles_country_length;
alter table public.profiles add constraint profiles_country_length
  check (country is null or char_length(country) between 1 and 80);

alter table public.profiles drop constraint if exists profiles_province_length;
alter table public.profiles add constraint profiles_province_length
  check (province is null or char_length(province) between 1 and 80);

alter table public.profiles drop constraint if exists profiles_suburb_length;
alter table public.profiles add constraint profiles_suburb_length
  check (suburb is null or char_length(suburb) between 1 and 80);

create index if not exists profiles_location_idx
  on public.profiles (latitude, longitude)
  where latitude is not null and longitude is not null and show_on_discover = true;

comment on column public.profiles.latitude is 'WGS84 latitude from device geolocation.';
comment on column public.profiles.longitude is 'WGS84 longitude from device geolocation.';
comment on column public.profiles.country is 'Reverse-geocoded country name.';
comment on column public.profiles.province is 'Reverse-geocoded state/province/region.';
comment on column public.profiles.suburb is 'Reverse-geocoded suburb/locality/neighbourhood.';

create or replace function public.profile_distance_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language sql
immutable
as $$
  select case
    when lat1 is null or lon1 is null or lat2 is null or lon2 is null then null
    else 6371 * acos(
      least(1, greatest(-1,
        cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1))
        + sin(radians(lat1)) * sin(radians(lat2))
      ))
    )
  end;
$$;

comment on function public.profile_distance_km is 'Great-circle distance in km between two WGS84 points.';

-- Restore user_profile_details if missing (safe after migration 004)
drop view if exists public.user_profile_details;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profile_interests'
      and column_name = 'option_id'
  ) then
    execute $view$
      create view public.user_profile_details as
      select
        p.user_id,
        p.email,
        p.display_name,
        p.avatar_url,
        p.bio,
        p.headline,
        p.city,
        p.pronouns,
        p.date_of_birth,
        p.vibe,
        p.is_premium,
        p.is_verified,
        p.show_on_discover,
        p.onboarding_completed_at,
        p.last_active_at,
        p.created_at,
        p.updated_at,
        coalesce(s.flames_sent, 0) as flames_sent,
        coalesce(s.matches_count, 0) as matches_count,
        coalesce(s.vibe_score, 80) as vibe_score,
        coalesce(s.profile_views, 0) as profile_views,
        coalesce(s.gift_earnings_cents, 0) as gift_earnings_cents,
        coalesce(
          (
            select json_agg(
              json_build_object(
                'key', o.option_key,
                'label', o.label,
                'emoji', o.emoji
              )
              order by pi.sort_order
            )
            from public.profile_interests pi
            join public.onboarding_options o on o.id = pi.option_id
            where pi.user_id = p.user_id
          ),
          '[]'::json
        ) as interests
      from public.profiles p
      left join public.profile_stats s on s.user_id = p.user_id
    $view$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profile_interests'
      and column_name = 'label'
  ) then
    execute $view$
      create view public.user_profile_details as
      select
        p.user_id,
        p.email,
        p.display_name,
        p.avatar_url,
        p.bio,
        p.headline,
        p.city,
        p.pronouns,
        p.date_of_birth,
        p.vibe,
        p.is_premium,
        p.is_verified,
        p.show_on_discover,
        p.onboarding_completed_at,
        p.last_active_at,
        p.created_at,
        p.updated_at,
        coalesce(s.flames_sent, 0) as flames_sent,
        coalesce(s.matches_count, 0) as matches_count,
        coalesce(s.vibe_score, 80) as vibe_score,
        coalesce(s.profile_views, 0) as profile_views,
        coalesce(s.gift_earnings_cents, 0) as gift_earnings_cents,
        coalesce(
          (
            select json_agg(pi.label order by pi.sort_order)
            from public.profile_interests pi
            where pi.user_id = p.user_id
          ),
          '[]'::json
        ) as interests
      from public.profiles p
      left join public.profile_stats s on s.user_id = p.user_id
    $view$;
  end if;
end $$;

notify pgrst, 'reload schema';
