import type { OnboardingInterestedIn, Profile } from '@/types';
import { normalizeProfileGender } from './normalizeProfileGender';
import { resolveProfileLocationName } from './resolveProfileLocationName';

type RawProfile = Profile & {
  interested_in?: OnboardingInterestedIn | OnboardingInterestedIn[] | string;
  location_name?: string | null;
  city?: string | null;
  suburb?: string | null;
  province?: string | null;
};

/** Map API / snake_case profile fields onto the frontend Profile shape. */
export function normalizeProfile<T extends Profile>(profile: T): T {
  const raw = profile as RawProfile;
  const interestedIn = raw.interestedIn ?? raw.interested_in;
  const gender = normalizeProfileGender(raw.gender as string | undefined);
  const locationName = resolveProfileLocationName(raw);

  return {
    ...profile,
    gender,
    interestedIn: interestedIn as Profile['interestedIn'],
    city: raw.city ?? profile.city,
    suburb: raw.suburb ?? profile.suburb,
    province: raw.province ?? profile.province,
    ...(locationName ? { locationName } : {}),
  };
}

export function normalizeProfiles<T extends Profile>(profiles: T[]): T[] {
  return profiles.map((profile) => normalizeProfile(profile));
}
