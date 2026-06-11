import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { hasSupabaseRealtime } from '@/config/env';
import { getSupabaseRealtimeClient } from '@/lib/supabaseClient';

interface SocialBroadcast {
  type: 'like';
  fromUserId: string;
  fromName: string;
  active?: boolean;
}

interface StoredMeetupSocial {
  likeUserIds: string[];
}

const STORAGE_PREFIX = 'lavey:meetup-social:';

function storageKey(meetupId: string): string {
  return `${STORAGE_PREFIX}${meetupId}`;
}

function readStored(meetupId: string): StoredMeetupSocial {
  try {
    const raw = localStorage.getItem(storageKey(meetupId));
    if (!raw) return { likeUserIds: [] };
    const parsed = JSON.parse(raw) as StoredMeetupSocial & { comments?: unknown[] };
    return {
      likeUserIds: Array.isArray(parsed.likeUserIds) ? parsed.likeUserIds : [],
    };
  } catch {
    return { likeUserIds: [] };
  }
}

function writeStored(meetupId: string, data: StoredMeetupSocial): void {
  try {
    localStorage.setItem(storageKey(meetupId), JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function toggleUserId(ids: string[], userId: string, active: boolean): string[] {
  const set = new Set(ids);
  if (active) set.add(userId);
  else set.delete(userId);
  return [...set];
}

interface UseMeetupCardSocialOptions {
  meetupId: string;
  localUserId: string;
  localDisplayName: string;
}

export function useMeetupCardSocial({
  meetupId,
  localUserId,
  localDisplayName,
}: UseMeetupCardSocialOptions) {
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const socialRef = useRef<StoredMeetupSocial>({ likeUserIds: [] });

  const applySocial = useCallback(
    (next: StoredMeetupSocial, persist = true) => {
      socialRef.current = next;
      setLikeCount(next.likeUserIds.length);
      setUserLiked(next.likeUserIds.includes(localUserId));
      if (persist) writeStored(meetupId, next);
    },
    [localUserId, meetupId],
  );

  const broadcast = useCallback((payload: SocialBroadcast) => {
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'social',
      payload,
    });
  }, []);

  const toggleLike = useCallback(() => {
    const current = socialRef.current;
    const already = current.likeUserIds.includes(localUserId);
    const active = !already;

    const next: StoredMeetupSocial = {
      likeUserIds: toggleUserId(current.likeUserIds, localUserId, active),
    };

    applySocial(next);
    broadcast({
      type: 'like',
      fromUserId: localUserId,
      fromName: localDisplayName,
      active,
    });
  }, [applySocial, broadcast, localDisplayName, localUserId]);

  const mergeBroadcast = useCallback(
    (payload: SocialBroadcast) => {
      if (!payload?.fromUserId || payload.type !== 'like') return;
      const current = socialRef.current;
      applySocial({
        likeUserIds: toggleUserId(current.likeUserIds, payload.fromUserId, Boolean(payload.active)),
      });
    },
    [applySocial],
  );

  useEffect(() => {
    if (!meetupId) return;
    applySocial(readStored(meetupId), false);
  }, [applySocial, meetupId]);

  useEffect(() => {
    if (!hasSupabaseRealtime() || !meetupId || !localUserId) return;

    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return;

    const channel = supabase.channel(`meetup-card:${meetupId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'social' }, ({ payload }) => {
        mergeBroadcast(payload as SocialBroadcast);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [localUserId, meetupId, mergeBroadcast]);

  return {
    likeCount,
    userLiked,
    toggleLike,
  };
}
