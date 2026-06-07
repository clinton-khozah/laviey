import { createSupabaseUserClient } from '../lib/supabase.user.js';
import type { AuthUser } from '../types/api.types.js';
import { AppError } from '../utils/appError.js';

interface ProfileLiteRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface SendFlameResult {
  matched: boolean;
  matchId?: string;
  profileName: string;
  profileAvatar: string;
  myAvatar?: string;
}

export interface MatchListItem {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  matchedAt: string;
}

import { ensureActiveMatch } from './match-pair.util.js';

function isMissingMatchingSchema(message: string): boolean {
  return /discover_swipe_events|match_pairs|match_events|discover_algorithm_variants/i.test(message);
}

export async function sendFlame(
  authUser: AuthUser,
  accessToken: string,
  targetProfileId: string,
): Promise<SendFlameResult> {
  if (!targetProfileId || targetProfileId.trim().length === 0) {
    throw new AppError(400, 'INVALID_PROFILE_ID', 'Profile id is required');
  }
  if (targetProfileId === authUser.id) {
    throw new AppError(400, 'INVALID_PROFILE_ID', 'You cannot flame your own profile');
  }

  const supabase = createSupabaseUserClient(accessToken);
  const targetResult = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .eq('user_id', targetProfileId)
    .eq('show_on_discover', true)
    .maybeSingle();

  if (targetResult.error) {
    throw new AppError(500, 'TARGET_PROFILE_READ_FAILED', targetResult.error.message);
  }
  if (!targetResult.data) {
    throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile no longer available');
  }

  const target = targetResult.data as ProfileLiteRow;

  const { error: swipeError } = await supabase.from('discover_swipe_events').insert({
    actor_user_id: authUser.id,
    target_user_id: targetProfileId,
    feed_type: 'for-you',
    action: 'like',
    signal_strength: 3,
  });

  if (swipeError) {
    if (isMissingMatchingSchema(swipeError.message)) {
      throw new AppError(
        500,
        'MATCHING_SCHEMA_MISSING',
        'Matching tables are missing. Run sql/008_discover_matching_engine.sql in Supabase, then try again.',
      );
    }
    throw new AppError(500, 'FLAME_SAVE_FAILED', swipeError.message);
  }

  const reciprocal = await supabase
    .from('discover_swipe_events')
    .select('id')
    .eq('actor_user_id', targetProfileId)
    .eq('target_user_id', authUser.id)
    .in('action', ['like', 'super_like'])
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reciprocal.error) {
    throw new AppError(500, 'FLAME_RECIPROCAL_CHECK_FAILED', reciprocal.error.message);
  }

  if (!reciprocal.data) {
    return {
      matched: false,
      profileName: target.display_name,
      profileAvatar: target.avatar_url ?? '',
    };
  }

  const matchId = await ensureActiveMatch(
    supabase,
    authUser.id,
    targetProfileId,
    'for-you',
    'flame',
    authUser.id,
    accessToken,
  );

  const meResult = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('user_id', authUser.id)
    .maybeSingle();

  return {
    matched: true,
    matchId,
    profileName: target.display_name,
    profileAvatar: target.avatar_url ?? '',
    myAvatar: (meResult.data as { avatar_url: string | null } | null)?.avatar_url ?? '',
  };
}

export async function listMatches(
  authUser: AuthUser,
  accessToken: string,
  limit = 30,
): Promise<MatchListItem[]> {
  const supabase = createSupabaseUserClient(accessToken);
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));

  const pairsResult = await supabase
    .from('match_pairs')
    .select('id, user_one_id, user_two_id, matched_at')
    .eq('status', 'active')
    .or(`user_one_id.eq.${authUser.id},user_two_id.eq.${authUser.id}`)
    .order('matched_at', { ascending: false })
    .limit(safeLimit);

  if (pairsResult.error) {
    if (isMissingMatchingSchema(pairsResult.error.message)) {
      throw new AppError(
        500,
        'MATCHING_SCHEMA_MISSING',
        'Matching tables are missing. Run sql/008_discover_matching_engine.sql in Supabase, then try again.',
      );
    }
    throw new AppError(500, 'MATCH_LIST_FAILED', pairsResult.error.message);
  }

  const pairs = (pairsResult.data ?? []) as Array<{
    id: string;
    user_one_id: string;
    user_two_id: string;
    matched_at: string;
  }>;

  if (pairs.length === 0) return [];

  const counterpartIds = pairs.map((pair) =>
    pair.user_one_id === authUser.id ? pair.user_two_id : pair.user_one_id,
  );

  const profileResult = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', counterpartIds);

  if (profileResult.error) {
    throw new AppError(500, 'MATCH_LIST_PROFILE_FAILED', profileResult.error.message);
  }

  const profileById = new Map<string, ProfileLiteRow>();
  for (const row of (profileResult.data as ProfileLiteRow[] | null) ?? []) {
    profileById.set(row.user_id, row);
  }

  return pairs
    .map((pair) => {
      const counterpartId = pair.user_one_id === authUser.id ? pair.user_two_id : pair.user_one_id;
      const profile = profileById.get(counterpartId);
      if (!profile) return null;
      return {
        id: pair.id,
        userId: counterpartId,
        name: profile.display_name,
        avatar: profile.avatar_url ?? '',
        matchedAt: pair.matched_at,
      };
    })
    .filter((item): item is MatchListItem => item !== null);
}
