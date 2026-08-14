import { useAppData } from '../context/AppDataContext';

/**
 * Shared likers list — one fetch via AppDataContext, consumed across Home, Chat, and Profile.
 */
export function useProfilesWhoLikedYou() {
  const { likers, likedBackIds, likersLoading, refreshLikers } = useAppData();
  return {
    profiles: likers,
    likedBackIds,
    count: likers.length,
    loading: likersLoading,
    refetch: refreshLikers,
  };
}
