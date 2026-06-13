export type NotificationKind = 'like' | 'crush' | 'post_like';

export interface NotificationEvent {
  id: string;
  actorUserId: string;
  actorName: string;
  actorAvatar: string;
  kind: NotificationKind;
  text: string;
  sentAt: string;
  read: boolean;
  postId?: string | null;
}

export const NOTIFICATIONS_CONVERSATION_ID = '__notifications__';

export function isNotificationsConversation(conversationId: string): boolean {
  return conversationId === NOTIFICATIONS_CONVERSATION_ID;
}
