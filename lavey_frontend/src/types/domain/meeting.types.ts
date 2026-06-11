import type { OnlineDate } from './room.types';

export interface MeetingParticipant {
  id: string;
  /** User id used when sending gifts */
  profileId: string;
  name: string;
  avatarUrl: string;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  /** Live WebRTC stream from a remote participant */
  stream?: MediaStream | null;
  isConnecting?: boolean;
}

export interface MeetingJoinResult {
  joinUrl: string;
  date: OnlineDate;
}

export interface ActiveMeetingSession {
  date: OnlineDate;
  accessCode: string;
  localDisplayName: string;
}

export interface MeetingChatMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  fromAvatarUrl?: string;
  text: string;
  sentAt: string;
  replyToId?: string;
  replyToName?: string;
  likeUserIds?: string[];
  isLocal?: boolean;
}
