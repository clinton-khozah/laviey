import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { hasSupabaseRealtime } from '@/config/env';
import { getSupabaseRealtimeClient } from '@/lib/supabaseClient';
import type { MeetingChatMessage } from '@/types';

interface ChatBroadcast {
  id: string;
  fromUserId: string;
  fromName: string;
  text: string;
  sentAt: string;
}

interface UseMeetingChatOptions {
  meetupId: string;
  localUserId: string;
  localDisplayName: string;
}

const MAX_MESSAGES = 120;
const MAX_TEXT_LENGTH = 500;

export function useMeetingChat({
  meetupId,
  localUserId,
  localDisplayName,
}: UseMeetingChatOptions) {
  const [messages, setMessages] = useState<MeetingChatMessage[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onMessageRef = useRef<((message: MeetingChatMessage) => void) | null>(null);

  const appendMessage = useCallback((message: MeetingChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev;
      const next = [...prev, message];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
    onMessageRef.current?.(message);
  }, []);

  const sendMessage = useCallback(
    (rawText: string) => {
      const text = rawText.trim().slice(0, MAX_TEXT_LENGTH);
      if (!text) return false;

      const message: MeetingChatMessage = {
        id: `${localUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fromUserId: localUserId,
        fromName: localDisplayName,
        text,
        sentAt: new Date().toISOString(),
        isLocal: true,
      };

      appendMessage(message);
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'chat',
        payload: {
          id: message.id,
          fromUserId: message.fromUserId,
          fromName: message.fromName,
          text: message.text,
          sentAt: message.sentAt,
        } satisfies ChatBroadcast,
      });
      return true;
    },
    [appendMessage, localDisplayName, localUserId],
  );

  const setOnIncomingMessage = useCallback((handler: ((message: MeetingChatMessage) => void) | null) => {
    onMessageRef.current = handler;
  }, []);

  useEffect(() => {
    if (!hasSupabaseRealtime() || !meetupId || !localUserId) return;

    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return;

    const channel = supabase.channel(`meetup-chat:${meetupId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        const data = payload as ChatBroadcast;
        if (!data?.id || !data.text || data.fromUserId === localUserId) return;
        appendMessage({
          id: data.id,
          fromUserId: data.fromUserId,
          fromName: data.fromName,
          text: data.text,
          sentAt: data.sentAt,
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setMessages([]);
    };
  }, [appendMessage, localUserId, meetupId]);

  return { messages, sendMessage, setOnIncomingMessage };
}
