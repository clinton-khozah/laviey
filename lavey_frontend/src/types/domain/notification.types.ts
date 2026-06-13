export type NotificationKind = 'like' | 'crush' | 'post_like' | 'verified' | 'match' | 'system';

export interface NotificationEvent {
  id: string;
  actorUserId: string | null;
  actorName: string;
  actorAvatar: string;
  kind: NotificationKind;
  title: string | null;
  body: string | null;
  text: string;
  sentAt: string;
  read: boolean;
  actionable: boolean;
  postId?: string | null;
  expiresAt?: string;
}

export function isActionableNotification(event: NotificationEvent): boolean {
  return event.actionable && Boolean(event.actorUserId);
}

export function notificationKindLabel(kind: NotificationKind): string {
  switch (kind) {
    case 'crush':
      return 'Crushed on you';
    case 'post_like':
      return 'Liked your post';
    case 'like':
      return 'Liked you';
    case 'verified':
      return 'Identity verified';
    case 'match':
      return 'New match';
    default:
      return 'Update';
  }
}
