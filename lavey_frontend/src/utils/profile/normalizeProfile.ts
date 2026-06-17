import type { OnboardingInterestedIn, Profile } from '@/types';

type RawProfile = Profile & {
  interested_in?: OnboardingInterestedIn | OnboardingInterestedIn[] | string;
};

/** Map API / snake_case profile fields onto the frontend Profile shape. */
export function normalizeProfile<T extends Profile>(profile: T): T {
  const raw = profile as RawProfile;
  const interestedIn = raw.interestedIn ?? raw.interested_in;

  return {
    ...profile,
    interestedIn: interestedIn as Profile['interestedIn'],
  };
}

export function normalizeProfiles<T extends Profile>(profiles: T[]): T[] {
  return profiles.map((profile) => normalizeProfile(profile));
}
