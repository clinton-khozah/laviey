import type { Conversation } from '@/types';
import { NOTIFICATIONS_CONVERSATION_ID } from '@/constants/notifications';
import { isICrushConversation } from '@/utils/messages/iCrushConversation';

function isNotificationsRow(conversation: Conversation): boolean {
  return (
    conversation.id === NOTIFICATIONS_CONVERSATION_ID ||
    conversation.conversationKind === 'notifications'
  );
}

/** Notifications pinned first, then starred, then unread, then most recent. */
export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const aNotif = isNotificationsRow(a);
    const bNotif = isNotificationsRow(b);
    if (aNotif && !bNotif) return -1;
    if (!aNotif && bNotif) return 1;

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
  return !isNotificationsRow(conversation) && !isICrushConversation(conversation);
}
