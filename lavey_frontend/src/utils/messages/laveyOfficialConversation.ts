import {
  LAVEY_OFFICIAL_CONVERSATION_ID,
  LAVEY_OFFICIAL_PROMO,
  LAVEY_OFFICIAL_STORAGE_KEY,
} from '@/constants/laveyOfficial';
import type { LaveyOfficialInbox } from '@/services/messages/laveyOfficialInboxService';
import type { Conversation } from '@/types';

export function isLaveyOfficialConversation(conversationId: string): boolean {
  return conversationId === LAVEY_OFFICIAL_CONVERSATION_ID;
}

export function isLaveyPromoUnread(): boolean {
  try {
    return window.localStorage.getItem(LAVEY_OFFICIAL_STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markLaveyPromoRead(): void {
  try {
    window.localStorage.setItem(LAVEY_OFFICIAL_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function buildLaveyOfficialConversation(inbox?: LaveyOfficialInbox | null): Conversation {
  const hasAdminMessages = Boolean(inbox?.messages.length);
  const promoUnread = !hasAdminMessages && isLaveyPromoUnread();
  const unreadCount = hasAdminMessages ? (inbox?.unreadCount ?? 0) : promoUnread ? 1 : 0;

  const lastMessage = hasAdminMessages
    ? (inbox?.lastMessage ?? LAVEY_OFFICIAL_PROMO.preview)
    : LAVEY_OFFICIAL_PROMO.preview;

  const lastMessageAt = hasAdminMessages
    ? (inbox?.lastMessageAt ?? LAVEY_OFFICIAL_PROMO.sentAt)
    : LAVEY_OFFICIAL_PROMO.sentAt;

  return {
    id: LAVEY_OFFICIAL_CONVERSATION_ID,
    conversationKind: 'lavey_official',
    participantProfileId: 'lavey',
    participantName: LAVEY_OFFICIAL_PROMO.name,
    participantAvatar: LAVEY_OFFICIAL_PROMO.logoUrl,
    lastMessage,
    lastMessageAt,
    unreadCount,
    isOnline: false,
    matchedAt: '',
    vibeScore: 0,
    isPinned: true,
  };
}
