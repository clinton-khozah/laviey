import {
  LAVEY_OFFICIAL_CONVERSATION_ID,
  LAVEY_OFFICIAL_PROMO,
  LAVEY_OFFICIAL_STORAGE_KEY,
} from '@/constants/laveyOfficial';
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

export function buildLaveyOfficialConversation(): Conversation {
  const unread = isLaveyPromoUnread();

  return {
    id: LAVEY_OFFICIAL_CONVERSATION_ID,
    conversationKind: 'lavey_official',
    participantProfileId: 'lavey',
    participantName: LAVEY_OFFICIAL_PROMO.name,
    participantAvatar: LAVEY_OFFICIAL_PROMO.logoUrl,
    lastMessage: LAVEY_OFFICIAL_PROMO.preview,
    lastMessageAt: LAVEY_OFFICIAL_PROMO.sentAt,
    unreadCount: unread ? 1 : 0,
    isOnline: false,
    matchedAt: '',
    vibeScore: 0,
    isPinned: true,
  };
}
