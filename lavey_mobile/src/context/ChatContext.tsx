import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { chatApi } from '../api/services';
import { useAuth } from '../hooks/useAuth';
import { appDataCache } from '../utils/appDataCache';
import type { Conversation } from '../types';
import { applyChatListFlags, loadChatListFlags, saveChatListFlags, type ChatListFlags } from '../utils/chatListFlags';

const acceptedRequests = new Map<string, string>();

type ChatValue = {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refresh(silent?: boolean): Promise<void>;
  acceptRequest(inviteId: string, next: Conversation): void;
  acceptedConversationId(inviteId: string): string | undefined;
  setChatFlag(kind: 'pinned' | 'muted', conversationId: string, value: boolean): void;
};

const ChatContext = createContext<ChatValue | null>(null);

export function ChatProvider({ children }: PropsWithChildren) {
  const { session, needsOnboardingQuiz } = useAuth();
  const userId = session?.user.id;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const flagsRef = useRef<ChatListFlags>({ pinned: {}, muted: {} });

  useEffect(() => {
    void loadChatListFlags().then((flags) => {
      flagsRef.current = flags;
      setConversations((current) => applyChatListFlags(current, flags));
    });
  }, []);

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
      if (!session || refreshInFlight.current) return;
      refreshInFlight.current = true;
      if (!silent) setLoading(true);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const request = chatApi.conversations();
        void request.catch(() => undefined);
        const next = await Promise.race([
          request,
          new Promise<Conversation[]>((_, reject) => {
            timer = setTimeout(() => reject(new Error("Could not load messages.")), 8000);
          }),
        ]);
        const opened = next.map((item) => {
          const realId = item.iCrushInviteId ? acceptedRequests.get(item.iCrushInviteId) : undefined;
          if (!realId) return item;
          return { ...item, id: realId, conversationKind: "match" as const, iCrushInviteId: undefined };
        });
        const flagged = applyChatListFlags(opened, flagsRef.current);
        setConversations((current) => {
          const same =
            current.length === flagged.length &&
            current.every((item, index) => item.id === flagged[index]?.id && item.conversationKind === flagged[index]?.conversationKind && item.lastMessageAt === flagged[index]?.lastMessageAt && item.unreadCount === flagged[index]?.unreadCount && Boolean(item.isPinned) === Boolean(flagged[index]?.isPinned) && Boolean(item.isMuted) === Boolean(flagged[index]?.isMuted));
          return same ? current : flagged;
        });
        setError(null);
        if (userId) void appDataCache.setConversations(userId, flagged);
      } catch (e) {
        if (!silent) setError(e instanceof Error ? e.message : 'Could not load messages.');
      } finally {
        if (timer) clearTimeout(timer);
        refreshInFlight.current = false;
        if (!silent) setLoading(false);
      }
    },
    [session, userId],
  );

  const acceptRequest = useCallback((inviteId: string, next: Conversation) => {
    acceptedRequests.set(inviteId, next.id);
    const opened: Conversation = { ...next, conversationKind: "match", iCrushInviteId: undefined };
    setConversations((current) => {
      const rest = current.filter((item) => item.iCrushInviteId !== inviteId && item.id !== `icrush-${inviteId}` && item.id !== opened.id);
      const updated = applyChatListFlags([opened, ...rest], flagsRef.current);
      if (userId) void appDataCache.setConversations(userId, updated);
      return updated;
    });
  }, [userId]);

  const acceptedConversationId = useCallback((inviteId: string) => acceptedRequests.get(inviteId), []);

  const setChatFlag = useCallback((kind: 'pinned' | 'muted', conversationId: string, value: boolean) => {
    const next: ChatListFlags = {
      ...flagsRef.current,
      [kind]: { ...flagsRef.current[kind], [conversationId]: value },
    };
    flagsRef.current = next;
    void saveChatListFlags(next);
    setConversations((current) => {
      const updated = applyChatListFlags(current, next);
      if (userId) void appDataCache.setConversations(userId, updated);
      return updated;
    });
  }, [userId]);

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
    <ChatContext.Provider value={useMemo(() => ({ conversations, loading, error, refresh, acceptRequest, acceptedConversationId, setChatFlag }), [conversations, loading, error, refresh, acceptRequest, acceptedConversationId, setChatFlag])}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('useChat must be used inside ChatProvider');
  return value;
}
