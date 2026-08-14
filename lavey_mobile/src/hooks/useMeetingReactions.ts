import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseRealtimeClient } from "../lib/supabaseRealtime";

export type MeetingReactionType = "like" | "live" | "love";

export interface MeetingReactionBurst {
  id: string;
  type: MeetingReactionType;
  fromUserId: string;
  fromName: string;
  isLocal?: boolean;
}

interface ReactionBroadcast {
  type: MeetingReactionType;
  fromUserId: string;
  fromName: string;
}

interface UseMeetingReactionsOptions {
  meetupId: string;
  localUserId: string;
  localDisplayName: string;
}

const BURST_LIFETIME_MS = 3000;

/** Ephemeral floating-emoji reactions broadcast over Supabase Realtime, mirrors lavey_frontend's useMeetingReactions. */
export function useMeetingReactions({ meetupId, localUserId, localDisplayName }: UseMeetingReactionsOptions) {
  const [bursts, setBursts] = useState<MeetingReactionBurst[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeBurst = useCallback((id: string) => {
    setBursts((prev) => prev.filter((burst) => burst.id !== id));
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const addBurst = useCallback(
    (type: MeetingReactionType, fromUserId: string, fromName: string, isLocal = false) => {
      const id = `${fromUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const burst: MeetingReactionBurst = { id, type, fromUserId, fromName, isLocal };
      setBursts((prev) => [...prev, burst]);
      const timeoutId = setTimeout(() => removeBurst(id), BURST_LIFETIME_MS);
      timeoutsRef.current.set(id, timeoutId);
    },
    [removeBurst],
  );

  const sendReaction = useCallback(
    (type: MeetingReactionType) => {
      addBurst(type, localUserId, localDisplayName, true);
      void channelRef.current?.send({
        type: "broadcast",
        event: "reaction",
        payload: { type, fromUserId: localUserId, fromName: localDisplayName } satisfies ReactionBroadcast,
      });
    },
    [addBurst, localDisplayName, localUserId],
  );

  useEffect(() => {
    if (!meetupId || !localUserId) return;
    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return;

    const channel = supabase.channel(`meetup-social:${meetupId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const data = payload as ReactionBroadcast;
        if (!data?.type || data.fromUserId === localUserId) return;
        addBurst(data.type, data.fromUserId, data.fromName);
      })
      .subscribe();

    return () => {
      for (const timeoutId of timeoutsRef.current.values()) clearTimeout(timeoutId);
      timeoutsRef.current.clear();
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setBursts([]);
    };
  }, [addBurst, localUserId, meetupId]);

  return { bursts, sendReaction };
}
