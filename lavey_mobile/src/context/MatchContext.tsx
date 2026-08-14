import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { discoverApi } from '../api/services';
import type { MatchResult, Profile, ProfilePost } from '../types';
type MatchValue = { match: (MatchResult & { profile: Profile }) | null; like(profile: Profile): Promise<MatchResult>; likePost(profile: Profile, post: ProfilePost): Promise<void>; crush(profile: Profile): Promise<MatchResult>; dismissMatch(): void };
const MatchContext = createContext<MatchValue | null>(null);
export function MatchProvider({ children }: PropsWithChildren) {
  const [match, setMatch] = useState<MatchValue['match']>(null);
  const like = useCallback(async (profile: Profile) => { const result = await discoverApi.like(profile.id); if (result.matched) setMatch({ ...result, profile }); return result; }, []);
  const crush = useCallback(async (profile: Profile) => { const result = await discoverApi.crush(profile.id); if (result.matched) setMatch({ ...result, profile }); return result; }, []);
  const likePost = useCallback(async (profile: Profile, post: ProfilePost) => { const result = await discoverApi.likePost(post.id); if (result.matched) setMatch({ matched: true, profile, profileName: result.ownerName, profileAvatar: result.ownerAvatar, myAvatar: result.myAvatar }); }, []);
  const value = useMemo(() => ({ match, like, likePost, crush, dismissMatch: () => setMatch(null) }), [match, like, likePost, crush]);
  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}
export function useMatch() { const value = useContext(MatchContext); if (!value) throw new Error('useMatch must be used inside MatchProvider'); return value; }
