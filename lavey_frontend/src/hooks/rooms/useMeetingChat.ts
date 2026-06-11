import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { hasSupabaseRealtime } from '@/config/env';
import { getSupabaseRealtimeClient } from '@/lib/supabaseClient';
import type { MeetingChatMessage } from '@/types';
import { readMeetupChat, writeMeetupChat } from '@/utils/meeting/meetupChatStorage';

interface ChatBroadcast {
  id: string;
  fromUserId: string;
  fromName: string;
  fromAvatarUrl?: string;
  text: string;
  sentAt: string;
  replyToId?: string;
  replyToName?: string;
}

interface SendMessageOptions {
  replyToId?: string;
  replyToName?: string;
}

interface ChatLikeBroadcast {
  messageId: string;
  fromUserId: string;
  active: boolean;
}

interface UseMeetingChatOptions {
  meetupId: string;
  localUserId: string;
  localDisplayName: string;
  localAvatarUrl?: string;
}

const MAX_MESSAGES = 120;
const MAX_TEXT_LENGTH = 500;

function normalizeMessage(message: MeetingChatMessage): MeetingChatMessage {
  return {
    ...message,
    likeUserIds: Array.isArray(message.likeUserIds) ? message.likeUserIds : [],
  };
}

function toggleLikeOnMessage(
  message: MeetingChatMessage,
  userId: string,
  active: boolean,
): MeetingChatMessage {
  const current = message.likeUserIds ?? [];
  const set = new Set(current);
  if (active) set.add(userId);
  else set.delete(userId);
  return { ...message, likeUserIds: [...set] };
}

export function useMeetingChat({
  meetupId,
  localUserId,
  localDisplayName,
  localAvatarUrl = '',
}: UseMeetingChatOptions) {
  const [messages, setMessages] = useState<MeetingChatMessage[]>(() =>
    readMeetupChat(meetupId).map(normalizeMessage),
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onMessageRef = useRef<((message: MeetingChatMessage) => void) | null>(null);

  const updateMessages = useCallback((updater: (prev: MeetingChatMessage[]) => MeetingChatMessage[]) => {
    setMessages((prev) => updater(prev));
  }, []);

  const appendMessage = useCallback((message: MeetingChatMessage) => {
    updateMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev;
      const next = [...prev, normalizeMessage(message)];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
    onMessageRef.current?.(message);
  }, [updateMessages]);

  const sendMessage = useCallback(
    (rawText: string, options?: SendMessageOptions) => {
      const text = rawText.trim().slice(0, MAX_TEXT_LENGTH);
      if (!text) return false;

      const message: MeetingChatMessage = {
        id: `${localUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fromUserId: localUserId,
        fromName: localDisplayName,
        fromAvatarUrl: localAvatarUrl || undefined,
        text,
        sentAt: new Date().toISOString(),
        replyToId: options?.replyToId,
        replyToName: options?.replyToName,
        likeUserIds: [],
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
          fromAvatarUrl: message.fromAvatarUrl,
          text: message.text,
          sentAt: message.sentAt,
          replyToId: message.replyToId,
          replyToName: message.replyToName,
        } satisfies ChatBroadcast,
      });
      return true;
    },
    [appendMessage, localAvatarUrl, localDisplayName, localUserId],
  );

  const toggleMessageLike = useCallback(
    (messageId: string) => {
      let active = false;

      updateMessages((prev) =>
        prev.map((message) => {
          if (message.id !== messageId) return message;
          const liked = (message.likeUserIds ?? []).includes(localUserId);
          active = !liked;
          return toggleLikeOnMessage(message, localUserId, active);
        }),
      );

      void channelRef.current?.send({
        type: 'broadcast',
        event: 'chat-like',
        payload: { messageId, fromUserId: localUserId, active } satisfies ChatLikeBroadcast,
      });
    },
    [localUserId, updateMessages],
  );

  const setOnIncomingMessage = useCallback((handler: ((message: MeetingChatMessage) => void) | null) => {
    onMessageRef.current = handler;
  }, []);

  useEffect(() => {
    setMessages(readMeetupChat(meetupId).map(normalizeMessage));
  }, [meetupId]);

  useEffect(() => {
    writeMeetupChat(meetupId, messages);
  }, [meetupId, messages]);

  useEffect(() => {
    if (!hasSupabaseRealtime() || !meetupId || !localUserId) return;

    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return;

    const channel = supabase.channel(`meetup-chat:${meetupId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        const data = payload as ChatBroadcast;
        if (!data?.id || !data.text) return;
        if (data.fromUserId === localUserId) return;
        appendMessage({
          id: data.id,
          fromUserId: data.fromUserId,
          fromName: data.fromName,
          fromAvatarUrl: data.fromAvatarUrl,
          text: data.text,
          sentAt: data.sentAt,
          replyToId: data.replyToId,
          replyToName: data.replyToName,
          likeUserIds: [],
        });
      })
      .on('broadcast', { event: 'chat-like' }, ({ payload }) => {
        const data = payload as ChatLikeBroadcast;
        if (!data?.messageId || !data.fromUserId) return;
        if (data.fromUserId === localUserId) return;
        updateMessages((prev) =>
          prev.map((message) =>
            message.id === data.messageId
              ? toggleLikeOnMessage(message, data.fromUserId, data.active)
              : message,
          ),
        );
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [appendMessage, localUserId, meetupId, updateMessages]);

  return { messages, sendMessage, toggleMessageLike, setOnIncomingMessage };
}
