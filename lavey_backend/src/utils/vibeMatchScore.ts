export const VIBE_MATCH_MIN = 70;
export const VIBE_MATCH_MAX = 100;

export interface VibeMatchViewer {
  interestKeys: Set<string>;
  religion: string | null;
  country: string | null;
}

export interface VibeMatchCandidate {
  interestKeys: string[];
  religion: string | null;
  country: string | null;
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
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

/** Personal compatibility score shown as "X% vibe match" (70–100). */
export function computeVibeMatchPercent(
  viewer: VibeMatchViewer,
  candidate: VibeMatchCandidate,
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
