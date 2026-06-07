import type { DeleteConversationScope } from '@/types';

const STORAGE_KEY = 'lavey_deleted_chats';

interface DeletedChatsState {
  forYou: string[];
  forBoth: string[];
}

function readState(): DeletedChatsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { forYou: [], forBoth: [] };
    const parsed = JSON.parse(raw) as Partial<DeletedChatsState>;
    return {
      forYou: Array.isArray(parsed.forYou) ? parsed.forYou : [],
      forBoth: Array.isArray(parsed.forBoth) ? parsed.forBoth : [],
    };
  } catch {
    return { forYou: [], forBoth: [] };
  }
}

function writeState(state: DeletedChatsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function markConversationDeleted(conversationId: string, scope: DeleteConversationScope): void {
  const state = readState();
  if (scope === 'for_both') {
    if (!state.forBoth.includes(conversationId)) state.forBoth.push(conversationId);
    state.forYou = state.forYou.filter((id) => id !== conversationId);
  } else if (!state.forYou.includes(conversationId)) {
    state.forYou.push(conversationId);
  }
  writeState(state);
}

export function isConversationHidden(conversationId: string): boolean {
  const state = readState();
  return state.forYou.includes(conversationId) || state.forBoth.includes(conversationId);
}

export function isConversationDeletedForBoth(conversationId: string): boolean {
  return readState().forBoth.includes(conversationId);
}
