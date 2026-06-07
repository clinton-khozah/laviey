-- 005 — Allow deleting onboarding interests (admin cleanup + quiz retakes)
--
-- The original trigger blocked ANY delete that left fewer than 3 interests.
-- That breaks:
--   • Deleting rows in Supabase Table Editor
--   • Deleting user_onboarding_responses (cascade deletes interests)
--   • Backend retake flow (delete old interests, then insert new ones)
--
-- Minimum of 3 is still enforced after INSERT (deferred constraint trigger).

create or replace function public.enforce_minimum_onboarding_interests()
returns trigger
language plpgsql
as $$
declare
  interest_count integer;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  select count(*) into interest_count
  from public.user_onboarding_interests
  where response_id = coalesce(new.response_id, old.response_id);

  if interest_count < 3 then
    raise exception 'At least 3 interests are required (currently %)', interest_count
      using errcode = '23514';
  end if;

  return new;
end;
$$;
