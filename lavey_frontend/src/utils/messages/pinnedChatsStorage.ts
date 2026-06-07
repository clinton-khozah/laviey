import type { Conversation } from '@/types';

const STORAGE_KEY = 'lavey_pinned_chats';

function readPinnedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writePinnedIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function isConversationPinned(conversationId: string): boolean {
  return readPinnedIds().includes(conversationId);
}

export function setConversationPinned(conversationId: string, pinned: boolean): void {
  const ids = readPinnedIds();
  const next = pinned
    ? ids.includes(conversationId)
      ? ids
      : [...ids, conversationId]
    : ids.filter((id) => id !== conversationId);
  writePinnedIds(next);
}

export function applyPinnedState(conversations: Conversation[]): Conversation[] {
  let pinnedIds = readPinnedIds();
  if (pinnedIds.length === 0) {
    const fromMock = conversations.filter((c) => c.isPinned).map((c) => c.id);
    if (fromMock.length > 0) {
      writePinnedIds(fromMock);
      pinnedIds = fromMock;
    }
  }
  const pinnedSet = new Set(pinnedIds);
  return conversations.map((c) => ({ ...c, isPinned: pinnedSet.has(c.id) }));
}
