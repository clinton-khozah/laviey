import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Conversation } from "../types";

const KEY = "@lavey/chat-list-flags";

export type ChatListFlags = {
  pinned: Record<string, boolean>;
  muted: Record<string, boolean>;
};

const empty: ChatListFlags = { pinned: {}, muted: {} };

export async function loadChatListFlags(): Promise<ChatListFlags> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<ChatListFlags>;
    return {
      pinned: parsed.pinned ?? {},
      muted: parsed.muted ?? {},
    };
  } catch {
    return empty;
  }
}

export function saveChatListFlags(flags: ChatListFlags): Promise<void> {
  return AsyncStorage.setItem(KEY, JSON.stringify(flags));
}

export function applyChatListFlags(items: Conversation[], flags: ChatListFlags): Conversation[] {
  const next = items.map((item) => ({
    ...item,
    isPinned: flags.pinned[item.id] ?? Boolean(item.isPinned),
    isMuted: flags.muted[item.id] ?? Boolean(item.isMuted),
  }));
  next.sort((a, b) => {
    if (Boolean(a.isPinned) === Boolean(b.isPinned)) return 0;
    return a.isPinned ? -1 : 1;
  });
  return next;
}
