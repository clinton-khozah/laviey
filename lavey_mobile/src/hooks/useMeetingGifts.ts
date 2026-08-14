import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAudioPlayer } from "expo-audio";
import { getSupabaseRealtimeClient } from "../lib/supabaseRealtime";

export interface MeetingGiftType {
  id: string;
  emoji: string;
  label: string;
}

export const MEETING_GIFT_TYPES: MeetingGiftType[] = [
  { id: "horse", emoji: "🐴", label: "Horse" },
  { id: "rose", emoji: "🌹", label: "Rose" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "crown", emoji: "👑", label: "Crown" },
  { id: "fire", emoji: "🔥", label: "Fire" },
];

export interface MeetingGiftEvent {
  id: string;
  giftId: string;
  emoji: string;
  label: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
}

interface UseMeetingGiftsOptions {
  meetupId: string;
  localUserId: string;
  localDisplayName: string;
}

const giftChimeAsset = require("../../assets/sounds/gift-chime.wav");

/** Ephemeral, celebratory in-meeting gifts — broadcast on the same channel as reactions, not tied to the wallet/payout system. */
export function useMeetingGifts({ meetupId, localUserId, localDisplayName }: UseMeetingGiftsOptions) {
  const [activeGift, setActiveGift] = useState<MeetingGiftEvent | null>(null);
  const queueRef = useRef<MeetingGiftEvent[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const player = useAudioPlayer(giftChimeAsset);

  const playChime = useCallback(() => {
    try {
      void player.seekTo(0);
      player.play();
    } catch {
      /* best-effort — never block the gift on audio failing */
    }
  }, [player]);

  const enqueue = useCallback(
    (event: MeetingGiftEvent) => {
      queueRef.current.push(event);
      setActiveGift((current) => {
        if (current) return current;
        return queueRef.current.shift() ?? null;
      });
      playChime();
    },
    [playChime],
  );

  const dismissActive = useCallback(() => {
    setActiveGift(() => queueRef.current.shift() ?? null);
  }, []);

  const sendGift = useCallback(
    (gift: MeetingGiftType, toUserId: string, toName: string) => {
      const event: MeetingGiftEvent = {
        id: `${localUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        giftId: gift.id,
        emoji: gift.emoji,
        label: gift.label,
        fromUserId: localUserId,
        fromName: localDisplayName,
        toUserId,
        toName,
      };
      enqueue(event);
      void channelRef.current?.send({ type: "broadcast", event: "gift", payload: event });
    },
    [enqueue, localDisplayName, localUserId],
  );

  useEffect(() => {
    if (!meetupId || !localUserId) return undefined;
    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return undefined;

    // Deliberately a distinct topic from useMeetingReactions's `meetup-social:${meetupId}` —
    // that name is shared with the web app for reaction parity, and two hooks both subscribing
    // to the same topic on the same mounted screen collide (supabase-js caches channels by
    // topic and hands the second subscriber back the first's already-subscribed instance,
    // which throws when it tries to attach its own listeners).
    const channel = supabase.channel(`meetup-gifts:${meetupId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "gift" }, ({ payload }) => {
        const data = payload as MeetingGiftEvent;
        if (!data?.id || data.fromUserId === localUserId) return;
        enqueue(data);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      queueRef.current = [];
      setActiveGift(null);
    };
  }, [enqueue, localUserId, meetupId]);

  return { activeGift, sendGift, dismissActive };
}
