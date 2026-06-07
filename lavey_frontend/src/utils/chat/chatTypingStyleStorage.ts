import {
  DEFAULT_CHAT_TYPING_STYLE,
  type ChatTypingStyle,
} from '@/types/domain/chatTypingStyle.types';

const STORAGE_KEY = 'lavey_chat_typing_style';

const VALID: ChatTypingStyle[] = ['romantic', 'classic', 'neon', 'minimal'];

export function loadChatTypingStyle(): ChatTypingStyle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && VALID.includes(raw as ChatTypingStyle)) {
      return raw as ChatTypingStyle;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CHAT_TYPING_STYLE;
}

export function saveChatTypingStyle(style: ChatTypingStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    /* ignore */
  }
}

export function applyChatTypingStyleToDocument(style: ChatTypingStyle): void {
  document.documentElement.setAttribute('data-chat-typing-style', style);
}
