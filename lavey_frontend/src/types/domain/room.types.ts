export type DateVisibility = 'public' | 'private';
export type DateStatus = 'live' | 'starting-soon' | 'scheduled';
export type InviteStatus = 'pending' | 'accepted' | 'declined';

/** @deprecated Use OnlineDate */
export type RoomStatus = DateStatus;

export interface OnlineDate {
  id: string;
  hostUserId?: string;
  title: string;
  topic: string;
  hostName: string;
  hostAvatar: string;
  status: DateStatus;
  visibility: DateVisibility;
  /** Required to enter the video room */
  accessCode: string;
  /** Shareable URL — opens Online Dates and joins with this code */
  joinLink?: string;
  participantCount: number;
  maxParticipants: number;
  startsInMinutes?: number;
  /** ISO start time from API */
  startsAt?: string;
  /** Human-readable schedule, e.g. "Tomorrow · 6:30 PM" */
  scheduledLabel?: string;
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
  fromProfileId?: string;
  title: string;
  topic: string;
  scheduledLabel: string;
  /** Only present after the invite is accepted */
  accessCode?: string;
  coverImage: string;
  status: InviteStatus;
}

export interface CreateDateInput {
  title: string;
  topic: string;
  visibility: DateVisibility;
  mode: 'post' | 'invite';
  /** Required when inviting — must be a matched profile id */
  inviteToProfileId?: string;
  inviteToName?: string;
  startsInMinutes?: number;
  /** Preferred — exact start time (ISO). */
  startsAt?: string;
  /** Uploaded cover shown on the meetup card and in the video room */
  coverImageUrl?: string;
}

export interface UpdateDateInput {
  title: string;
  topic: string;
  startsAt: string;
  coverImageUrl?: string;
}
