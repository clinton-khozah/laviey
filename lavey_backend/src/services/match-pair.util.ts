import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../utils/appError.js';
import { ensureChatConversationForMatch } from './chat.service.js';

type MatchStatus = 'active' | 'hidden' | 'blocked' | 'unmatched';

interface ExistingMatchRow {
  id: string;
  user_one_id: string;
  user_two_id: string;
  status: MatchStatus;
}

export function orderedPair(a: string, b: string): { one: string; two: string } {
  return a < b ? { one: a, two: b } : { one: b, two: a };
}

export async function ensureActiveMatch(
  supabase: SupabaseClient,
  userA: string,
  userB: string,
  feedType: string,
  eventSource: string,
  actorUserId: string,
  accessToken?: string,
): Promise<string> {
  const pair = orderedPair(userA, userB);

  const existing = await supabase
    .from('match_pairs')
    .select('id, user_one_id, user_two_id, status')
    .eq('user_one_id', pair.one)
    .eq('user_two_id', pair.two)
    .maybeSingle();

  if (existing.error) {
    throw new AppError(500, 'MATCH_LOOKUP_FAILED', existing.error.message);
  }

  let matchId = (existing.data as ExistingMatchRow | null)?.id;

  if (!matchId) {
    const created = await supabase
      .from('match_pairs')
      .insert({
        user_one_id: pair.one,
        user_two_id: pair.two,
        status: 'active',
        matched_on_feed_type: feedType,
      })
      .select('id')
      .single();

    if (created.error || !created.data) {
      throw new AppError(500, 'MATCH_CREATE_FAILED', created.error?.message ?? 'Could not create match');
    }
    matchId = created.data.id as string;
  } else if ((existing.data as ExistingMatchRow).status !== 'active') {
    const restored = await supabase
      .from('match_pairs')
      .update({ status: 'active', matched_at: new Date().toISOString() })
      .eq('id', matchId)
      .select('id')
      .single();

    if (restored.error || !restored.data) {
      throw new AppError(500, 'MATCH_RESTORE_FAILED', restored.error?.message ?? 'Could not restore match');
    }
  }

  const { error: eventError } = await supabase.from('match_events').insert({
    match_id: matchId,
    actor_user_id: actorUserId,
    event_type: 'created',
    metadata: { source: eventSource },
  });

  if (eventError) {
    console.warn('[matches] event insert skipped:', eventError.message);
  }

  if (accessToken) {
    try {
      await ensureChatConversationForMatch(actorUserId, accessToken, matchId);
    } catch (err) {
      console.warn('[chat] conversation bootstrap skipped:', err);
    }
  }

  return matchId;
}
