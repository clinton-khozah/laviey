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
