import { useEffect, useState } from "react";
import { getSupabaseRealtimeClient } from "../lib/supabaseRealtime";

/**
 * Which of these meetups actually have someone connected right now — listens (read-only, never
 * tracks its own presence) on the same `meetup:${id}` channel the video room uses, so "Live" on
 * the list reflects real presence instead of just "the scheduled start time has passed."
 */
export function useLiveMeetupPresence(meetupIds: string[]): Set<string> {
  const idsKey = meetupIds.join(",");
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    const supabase = getSupabaseRealtimeClient();
    if (!supabase || ids.length === 0) {
      setLiveIds(new Set());
      return undefined;
    }

    const setPresent = (id: string, present: boolean) => {
      setLiveIds((prev) => {
        if (present === prev.has(id)) return prev;
        const next = new Set(prev);
        if (present) next.add(id);
        else next.delete(id);
        return next;
      });
    };

    const ownedChannels: ReturnType<typeof supabase.channel>[] = [];
    const pollIntervals: ReturnType<typeof setInterval>[] = [];

    for (const id of ids) {
      // supabase-js caches channels by topic — if the video room for this meetup is already
      // open (useMeetupWebRTC), `supabase.channel()` would hand back that already-subscribed
      // instance, and attaching new listeners to it throws. Detect that case and just poll its
      // presence state instead of touching its subscription.
      const existing = supabase.getChannels().find((c) => c.topic === `realtime:meetup:${id}`);
      if (existing) {
        const poll = () => setPresent(id, Object.keys(existing.presenceState()).length > 0);
        poll();
        pollIntervals.push(setInterval(poll, 3000));
        continue;
      }

      const channel = supabase.channel(`meetup:${id}`, {
        config: { presence: { key: `watcher-${Math.random().toString(36).slice(2)}` } },
      });
      channel
        .on("presence", { event: "sync" }, () => {
          setPresent(id, Object.keys(channel.presenceState()).length > 0);
        })
        .subscribe();
      ownedChannels.push(channel);
    }

    return () => {
      for (const channel of ownedChannels) void supabase.removeChannel(channel);
      for (const interval of pollIntervals) clearInterval(interval);
      setLiveIds(new Set());
    };
  }, [idsKey]);

  return liveIds;
}
