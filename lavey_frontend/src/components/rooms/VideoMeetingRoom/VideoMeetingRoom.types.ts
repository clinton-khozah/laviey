import type { ActiveMeetingSession, MeetingParticipant } from '@/types';

export interface VideoMeetingRoomProps {
  session: ActiveMeetingSession;
  participants: MeetingParticipant[];
  onLeave: () => void;
}
