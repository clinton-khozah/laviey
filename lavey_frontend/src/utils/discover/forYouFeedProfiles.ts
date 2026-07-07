import type { Profile } from '@/types';

function sortByBestFit(profiles: Profile[]): Profile[] {
  return [...profiles].sort((a, b) => b.vibeScore - a.vibeScore);
}

/** Fisher–Yates shuffle (mutates copy). */
function shuffleProfiles(profiles: Profile[]): Profile[] {
  const next = [...profiles];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

/**
 * For You feed: show unliked best matches first.
 * When every profile in the pool has been liked, reshuffle the pool for another pass.
 */
let recyclePoolKey = '';
let recycleOrder: Profile[] = [];

export function resolveForYouFeedProfiles(
  pool: Profile[],
  likedIds: Set<string>,
): { profiles: Profile[]; isRecycling: boolean } {
  if (pool.length === 0) {
    recyclePoolKey = '';
    recycleOrder = [];
    return { profiles: [], isRecycling: false };
  }

  const unliked = pool.filter((profile) => !likedIds.has(profile.id));
  if (unliked.length > 0) {
    recyclePoolKey = '';
    recycleOrder = [];
    return { profiles: unliked, isRecycling: false };
  }

  const poolKey = pool
    .map((profile) => profile.id)
    .sort()
    .join(',');
  if (recyclePoolKey !== poolKey || recycleOrder.length === 0) {
    recyclePoolKey = poolKey;
    recycleOrder = shuffleProfiles(sortByBestFit(pool));
  }

  return { profiles: recycleOrder, isRecycling: true };
}
