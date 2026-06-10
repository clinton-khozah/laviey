import type { OnboardingQuizAnswers } from '@/types/domain/onboardingQuiz.types';
import type { Profile } from '@/types';
import { loadOnboardingQuizAnswers } from '@/utils/onboarding/onboardingQuizStorage';

export const VIBE_MATCH_MIN = 70;
export const VIBE_MATCH_MAX = 100;

const INTEREST_LABEL_TO_KEY: Record<string, string> = {
  hiking: 'outdoors',
  photography: 'art',
  dogs: 'pets',
  music: 'music',
  cooking: 'food',
  '80s': 'music',
  books: 'reading',
  art: 'art',
  cats: 'pets',
  travel: 'travel',
  yoga: 'wellness',
  wine: 'food',
  gaming: 'gaming',
  fitness: 'fitness',
  movies: 'movies',
  tech: 'tech',
  nightlife: 'nightlife',
  shopping: 'shopping',
};

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function profileInterestKeys(profile: Profile): string[] {
  if (profile.interestKeys?.length) return profile.interestKeys;

  return profile.interests
    .map((label) => {
      const normalized = normalizeToken(label);
      return INTEREST_LABEL_TO_KEY[normalized] ?? normalized;
    })
    .filter(Boolean);
}

function interestOverlapScore(viewerKeys: Set<string>, candidateKeys: string[]): number {
  if (viewerKeys.size === 0 && candidateKeys.length === 0) return 0.55;

  const candidateSet = new Set(candidateKeys.map((key) => normalizeToken(key)).filter(Boolean));
  if (viewerKeys.size === 0 || candidateSet.size === 0) return 0.45;

  let intersection = 0;
  for (const key of viewerKeys) {
    if (candidateSet.has(key)) intersection += 1;
  }

  const union = new Set([...viewerKeys, ...candidateSet]).size;
  if (union === 0) return 0.45;

  return intersection / union;
}

function religionMatchScore(viewerReligion: string | null, candidateReligion: string | null): number {
  const viewer = normalizeToken(viewerReligion);
  const candidate = normalizeToken(candidateReligion);

  if (!viewer || !candidate) return 0.6;
  if (viewer === 'prefer-not-to-say' || candidate === 'prefer-not-to-say') return 0.75;
  if (viewer === candidate) return 1;
  if (viewer === 'spiritual' && (candidate === 'christian' || candidate === 'buddhist' || candidate === 'hindu')) {
    return 0.8;
  }
  return 0.35;
}

function countryMatchScore(viewerCountry: string | null, candidateCountry: string | null): number {
  const viewer = normalizeToken(viewerCountry);
  const candidate = normalizeToken(candidateCountry);

  if (!viewer || !candidate) return 0.6;
  if (viewer === candidate) return 1;

  const viewerTokens = new Set(viewer.split(/[\s,]+/).filter(Boolean));
  const candidateTokens = new Set(candidate.split(/[\s,]+/).filter(Boolean));
  for (const token of viewerTokens) {
    if (candidateTokens.has(token)) return 0.85;
  }

  return 0.4;
}

export function computeVibeMatchPercent(
  viewer: {
    interestKeys: Set<string>;
    religion: string | null;
    country: string | null;
  },
  candidate: {
    interestKeys: string[];
    religion: string | null;
    country: string | null;
  },
): number {
  const interestScore = interestOverlapScore(viewer.interestKeys, candidate.interestKeys);
  const religionScore = religionMatchScore(viewer.religion, candidate.religion);
  const countryScore = countryMatchScore(viewer.country, candidate.country);

  const raw =
    interestScore * 0.5 +
    religionScore * 0.25 +
    countryScore * 0.25;

  const percent = Math.round(VIBE_MATCH_MIN + raw * (VIBE_MATCH_MAX - VIBE_MATCH_MIN));
  return Math.max(VIBE_MATCH_MIN, Math.min(VIBE_MATCH_MAX, percent));
}

export function viewerFromOnboardingQuiz(
  answers: OnboardingQuizAnswers | null,
): {
  interestKeys: Set<string>;
  religion: string | null;
  country: string | null;
} {
  if (!answers) {
    return { interestKeys: new Set(), religion: null, country: null };
  }

  return {
    interestKeys: new Set(answers.interests.map((key) => normalizeToken(key))),
    religion: answers.religion,
    country: answers.location?.country ?? null,
  };
}

export function applyVibeMatchToProfiles(profiles: Profile[]): Profile[] {
  const viewer = viewerFromOnboardingQuiz(loadOnboardingQuizAnswers());

  return profiles.map((profile) => ({
    ...profile,
    vibeScore: computeVibeMatchPercent(viewer, {
      interestKeys: profileInterestKeys(profile),
      religion: profile.religion ?? null,
      country: profile.country ?? null,
    }),
  }));
}
