import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeChatUpdates } from '@/lib/supabaseClient';
import { messageService } from '@/services';
import type { ChatMessage, DeleteMessageScope } from '@/types';

export function useChatThread(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const typingTimerRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  const loadMessages = useCallback(async (id: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await messageService.getMessages(id);
      setMessages(data);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const id = conversationId;

    void (async () => {
      await loadMessages(id);
      if (!cancelled) await messageService.markConversationRead(id);
    })();

    const unsubscribe = subscribeChatUpdates(() => {
      if (!cancelled) void loadMessages(id, true);
    }, id);

    return () => {
      cancelled = true;
      unsubscribe();
      if (isTypingRef.current) {
        void messageService.setTyping(id, false);
        isTypingRef.current = false;
      }
    };
  }, [conversationId, loadMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !text.trim()) return;
      setIsSending(true);
      try {
        const msg = await messageService.sendMessage(conversationId, text.trim());
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        await messageService.setTyping(conversationId, false);
        isTypingRef.current = false;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId],
  );

  const notifyTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;

      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }

      if (isTyping) {
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          void messageService.setTyping(conversationId, true);
        }
        typingTimerRef.current = window.setTimeout(() => {
          isTypingRef.current = false;
          void messageService.setTyping(conversationId, false);
        }, 2500);
        return;
      }

      if (isTypingRef.current) {
        isTypingRef.current = false;
        void messageService.setTyping(conversationId, false);
      }
    },
    [conversationId],
  );

  const reactToMessage = useCallback(
    async (messageId: string, emoji: string) => {
      if (!conversationId) return;
      let nextEmoji: string | null = null;
      setMessages((prev) => {
        const target = prev.find((m) => m.id === messageId);
        nextEmoji = target?.reaction === emoji ? null : emoji;
        return prev.map((m) =>
          m.id === messageId ? { ...m, reaction: nextEmoji ?? undefined } : m,
        );
      });
      await messageService.setMessageReaction(conversationId, messageId, nextEmoji);
    },
    [conversationId],
  );

  const deleteMessage = useCallback(
    async (messageId: string, scope: DeleteMessageScope) => {
      if (!conversationId) return;
      await messageService.deleteMessage(conversationId, messageId, scope);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [conversationId],
  );

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    notifyTyping,
    reactToMessage,
    deleteMessage,
  };
}
