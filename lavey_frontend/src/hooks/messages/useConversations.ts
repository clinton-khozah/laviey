import { useCallback, useEffect, useState } from 'react';
import { subscribeChatUpdates } from '@/lib/supabaseClient';
import { messageService } from '@/services';
import type { Conversation, DeleteConversationScope } from '@/types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      setConversations(await messageService.getConversations());
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  useEffect(() => {
    const unsubscribe = subscribeChatUpdates(() => {
      void fetch(true);
    });
    const poll = window.setInterval(() => void fetch(true), 12_000);
    const presence = window.setInterval(() => void messageService.touchPresence(), 30_000);

    void messageService.touchPresence();

    return () => {
      unsubscribe();
      window.clearInterval(poll);
      window.clearInterval(presence);
    };
  }, [fetch]);

  const deleteConversation = useCallback(
    async (conversationId: string, scope: DeleteConversationScope) => {
      await messageService.deleteConversation(conversationId, scope);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    },
    [],
  );

  const toggleConversationStar = useCallback(async (conversationId: string) => {
    let nextPinned = false;
    setConversations((prev) => {
      const current = prev.find((c) => c.id === conversationId);
      nextPinned = !current?.isPinned;
      return prev.map((c) =>
        c.id === conversationId ? { ...c, isPinned: nextPinned } : c,
      );
    });
    await messageService.setConversationPinned(conversationId, nextPinned);
  }, []);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetch,
    deleteConversation,
    toggleConversationStar,
  };
}
