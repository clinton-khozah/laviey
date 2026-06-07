import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ChatTypingStyle } from '@/types/domain/chatTypingStyle.types';
import {
  applyChatTypingStyleToDocument,
  loadChatTypingStyle,
  saveChatTypingStyle,
} from '@/utils/chat/chatTypingStyleStorage';

export interface ChatTypingStyleContextValue {
  chatTypingStyle: ChatTypingStyle;
  setChatTypingStyle: (style: ChatTypingStyle) => void;
}

const ChatTypingStyleContext = createContext<ChatTypingStyleContextValue | null>(null);

export function ChatTypingStyleProvider({ children }: { children: ReactNode }) {
  const [chatTypingStyle, setStyleState] = useState<ChatTypingStyle>(() => loadChatTypingStyle());

  const setChatTypingStyle = useCallback((next: ChatTypingStyle) => {
    setStyleState(next);
    saveChatTypingStyle(next);
    applyChatTypingStyleToDocument(next);
  }, []);

  const value = useMemo(
    () => ({ chatTypingStyle, setChatTypingStyle }),
    [chatTypingStyle, setChatTypingStyle],
  );

  return (
    <ChatTypingStyleContext.Provider value={value}>{children}</ChatTypingStyleContext.Provider>
  );
}

export function useChatTypingStyle(): ChatTypingStyleContextValue {
  const ctx = useContext(ChatTypingStyleContext);
  if (!ctx) {
    throw new Error('useChatTypingStyle must be used within ChatTypingStyleProvider');
  }
  return ctx;
}
