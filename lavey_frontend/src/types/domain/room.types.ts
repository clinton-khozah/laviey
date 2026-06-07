export type DateVisibility = 'public' | 'private';
export type DateStatus = 'live' | 'starting-soon' | 'scheduled';
export type InviteStatus = 'pending' | 'accepted' | 'declined';

/** @deprecated Use OnlineDate */
export type RoomStatus = DateStatus;

export interface OnlineDate {
  id: string;
  title: string;
  topic: string;
  hostName: string;
  hostAvatar: string;
  status: DateStatus;
  visibility: DateVisibility;
  /** Required to enter the video room */
  accessCode: string;
  participantCount: number;
  maxParticipants: number;
  startsInMinutes?: number;
  coverImage: string;
  tags: string[];
  isHostedByYou?: boolean;
}

/** @deprecated Use OnlineDate */
export type VibeRoom = OnlineDate;

export interface DateInvite {
  id: string;
  dateId: string;
  fromName: string;
  fromAvatar: string;
  title: string;
  topic: string;
  scheduledLabel: string;
  accessCode: string;
  coverImage: string;
  status: InviteStatus;
}

export interface CreateDateInput {
  title: string;
  topic: string;
  visibility: DateVisibility;
  mode: 'post' | 'invite';
  inviteToName?: string;
  startsInMinutes: number;
}
