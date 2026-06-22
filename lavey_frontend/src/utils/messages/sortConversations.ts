import type { Conversation } from '@/types';
import { NOTIFICATIONS_CONVERSATION_ID } from '@/constants/notifications';
import { LAVEY_OFFICIAL_CONVERSATION_ID } from '@/constants/laveyOfficial';
import { isICrushConversation } from '@/utils/messages/iCrushConversation';

function isNotificationsRow(conversation: Conversation): boolean {
  return (
    conversation.id === NOTIFICATIONS_CONVERSATION_ID ||
    conversation.conversationKind === 'notifications'
  );
}

function isLaveyOfficialRow(conversation: Conversation): boolean {
  return (
    conversation.id === LAVEY_OFFICIAL_CONVERSATION_ID ||
    conversation.conversationKind === 'lavey_official'
  );
}

/** Notifications first, then Lavey official, then starred, unread, recent. */
export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const aNotif = isNotificationsRow(a);
    const bNotif = isNotificationsRow(b);
    if (aNotif && !bNotif) return -1;
    if (!aNotif && bNotif) return 1;

    const aLavey = isLaveyOfficialRow(a);
    const bLavey = isLaveyOfficialRow(b);
    if (aLavey && !bLavey) return -1;
    if (!aLavey && bLavey) return 1;

    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    if (a.lastSeenAt && b.lastSeenAt) {
      return b.lastSeenAt.localeCompare(a.lastSeenAt);
    }
    return 0;
  });
}

export function isMatchConversation(conversation: Conversation): boolean {
  return (
    !isNotificationsRow(conversation) &&
    !isLaveyOfficialRow(conversation) &&
    !isICrushConversation(conversation)
  );
}
