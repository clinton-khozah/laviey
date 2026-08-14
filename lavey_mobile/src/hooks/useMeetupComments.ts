import { useCallback, useEffect, useRef, useState } from "react";
import { roomApi } from "../api/services";
import type { MeetupComment } from "../types";

/** DB-backed meetup card comments — polled like the group chat detail screen (no realtime channel needed). */
export function useMeetupComments(meetupId: string | null, enabled: boolean) {
  const [comments, setComments] = useState<MeetupComment[]>([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!meetupId) return;
    try {
      setComments(await roomApi.comments(meetupId));
    } catch {
      /* keep last known comments on a transient failure */
    }
  }, [meetupId]);

  useEffect(() => {
    if (!enabled || !meetupId) return undefined;
    setLoading(true);
    void load().finally(() => setLoading(false));
    pollRef.current = setInterval(() => void load(), 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [enabled, meetupId, load]);

  const sendComment = useCallback(
    async (body: string, replyToCommentId?: string, replyToName?: string) => {
      if (!meetupId) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;
      const comment = await roomApi.sendComment(meetupId, trimmed, replyToCommentId, replyToName);
      setComments((prev) => [...prev, comment]);
      return true;
    },
    [meetupId],
  );

  const toggleLike = useCallback(async (commentId: string) => {
    let nextActive = true;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        nextActive = !c.likedByMe;
        return { ...c, likedByMe: nextActive, likeCount: c.likeCount + (nextActive ? 1 : -1) };
      }),
    );
    try {
      const result = await roomApi.toggleCommentLike(commentId, nextActive);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, likedByMe: result.likedByMe, likeCount: result.likeCount } : c)),
      );
    } catch {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, likedByMe: !nextActive, likeCount: c.likeCount + (nextActive ? -1 : 1) } : c,
        ),
      );
    }
  }, []);

  return { comments, loading, sendComment, toggleLike, reload: load };
}
