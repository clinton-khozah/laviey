import type { ChatMessage, DeleteConversationScope } from '@/types';

const STORAGE_KEY = 'lavey_message_meta';

interface ConversationMessageMeta {
  reactions: Record<string, string>;
  hiddenForYou: string[];
  hiddenForBoth: string[];
}

type MessageMetaStore = Record<string, ConversationMessageMeta>;

function readStore(): MessageMetaStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MessageMetaStore;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: MessageMetaStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function getConversationMeta(conversationId: string): ConversationMessageMeta {
  const store = readStore();
  return (
    store[conversationId] ?? {
      reactions: {},
      hiddenForYou: [],
      hiddenForBoth: [],
    }
  );
}

function saveConversationMeta(conversationId: string, meta: ConversationMessageMeta): void {
  const store = readStore();
  store[conversationId] = meta;
  writeStore(store);
}

export function applyMessageMeta(
  conversationId: string,
  messages: ChatMessage[],
): ChatMessage[] {
  const meta = getConversationMeta(conversationId);
  const hidden = new Set([...meta.hiddenForYou, ...meta.hiddenForBoth]);

  return messages
    .filter((m) => !hidden.has(m.id))
    .map((m) => ({
      ...m,
      reaction: meta.reactions[m.id],
    }));
}

export function setMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string | null,
): void {
  const meta = getConversationMeta(conversationId);
  if (emoji) meta.reactions[messageId] = emoji;
  else delete meta.reactions[messageId];
  saveConversationMeta(conversationId, meta);
}

export function markMessageDeleted(
  conversationId: string,
  messageId: string,
  scope: DeleteConversationScope,
): void {
  const meta = getConversationMeta(conversationId);
  if (scope === 'for_both') {
    if (!meta.hiddenForBoth.includes(messageId)) meta.hiddenForBoth.push(messageId);
    meta.hiddenForYou = meta.hiddenForYou.filter((id) => id !== messageId);
  } else if (!meta.hiddenForYou.includes(messageId)) {
    meta.hiddenForYou.push(messageId);
  }
  saveConversationMeta(conversationId, meta);
}
