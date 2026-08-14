import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { chatApi } from '../api/services';
import { useAuth } from '../hooks/useAuth';
import { appDataCache } from '../utils/appDataCache';
import type { Conversation } from '../types';

type ChatValue = {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refresh(silent?: boolean): Promise<void>;
};

const ChatContext = createContext<ChatValue | null>(null);

export function ChatProvider({ children }: PropsWithChildren) {
  const { session, needsOnboardingQuiz } = useAuth();
  const userId = session?.user.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || needsOnboardingQuiz) {
      setConversations([]);
      return;
    }
    void appDataCache.getConversations(userId).then((cached) => {
      if (cached?.length) setConversations(cached);
    });
  }, [userId, needsOnboardingQuiz]);

  const refresh = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent && !conversations.length) setLoading(true);
      try {
        const next = await chatApi.conversations();
        setConversations(next);
        setError(null);
        if (userId) void appDataCache.setConversations(userId, next);
      } catch (e) {
        if (!silent) setError(e instanceof Error ? e.message : 'Could not load messages.');
      } finally {
        if (!silent && !conversations.length) setLoading(false);
      }
    },
    [session, userId, conversations.length],
  );

  useEffect(() => {
    if (!session || needsOnboardingQuiz) {
      setConversations([]);
      return;
    }
    void refresh(true).catch(() => undefined);
    const timer = setInterval(() => {
      void refresh(true).catch(() => undefined);
    }, 12_000);
    return () => clearInterval(timer);
  }, [session, needsOnboardingQuiz, refresh]);

  return (
    <ChatContext.Provider value={useMemo(() => ({ conversations, loading, error, refresh }), [conversations, loading, error, refresh])}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('useChat must be used inside ChatProvider');
  return value;
}
