export type NotificationKind =
  | 'like'
  | 'crush'
  | 'post_like'
  | 'profile_view'
  | 'verified'
  | 'match'
  | 'system'
  | 'meetup_like'
  | 'meetup_join';

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
  meetupId?: string | null;
  expiresAt?: string;
}

export function isActionableNotification(event: NotificationEvent): boolean {
  return event.actionable && Boolean(event.actorUserId);
}

export function notificationHasProfile(event: NotificationEvent): boolean {
  return Boolean(event.actorUserId) && event.kind !== 'verified' && event.kind !== 'system';
}

export function notificationKindLabel(kind: NotificationKind): string {
  switch (kind) {
    case 'crush':
      return 'Crushed on you';
    case 'post_like':
      return 'Liked your post';
    case 'profile_view':
      return 'Viewed your profile';
    case 'like':
      return 'Liked you';
    case 'verified':
      return 'Identity verified';
    case 'match':
      return 'New match';
    case 'meetup_like':
      return 'Liked your meetup';
    case 'meetup_join':
      return 'Joined your meetup';
    default:
      return 'Update';
  }
}
