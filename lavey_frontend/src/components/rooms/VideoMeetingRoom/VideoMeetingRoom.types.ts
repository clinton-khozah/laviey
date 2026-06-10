import type { ActiveMeetingSession, MeetingParticipant } from '@/types';
import type { useLocalMedia } from '@/hooks/rooms/useLocalMedia';

export type MeetupConnectionStatus = 'connecting' | 'connected' | 'unsupported';

export interface VideoMeetingRoomProps {
  session: ActiveMeetingSession;
  participants: MeetingParticipant[];
  localMedia: ReturnType<typeof useLocalMedia>;
  connectionStatus?: MeetupConnectionStatus;
  localUserId: string;
  onLeave: () => void;
}
