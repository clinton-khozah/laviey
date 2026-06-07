import { useMemo } from 'react';
import { VideoMeetingRoom } from '@/components/rooms/VideoMeetingRoom';
import { getMockMeetingParticipants } from '@/services/mocks/meeting.mock';
import type { ActiveMeetingSession } from '@/types';

interface ActiveMeetingContainerProps {
  session: ActiveMeetingSession;
  onLeave: () => void;
}

export function ActiveMeetingContainer({ session, onLeave }: ActiveMeetingContainerProps) {
  const participants = useMemo(
    () => getMockMeetingParticipants(session.date),
    [session.date],
  );

  return <VideoMeetingRoom session={session} participants={participants} onLeave={onLeave} />;
}
