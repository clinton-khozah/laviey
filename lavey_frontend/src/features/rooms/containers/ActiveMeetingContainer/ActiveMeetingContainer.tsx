import { VideoMeetingRoom } from '@/components/rooms/VideoMeetingRoom';
import { useAuth, useLocalMedia, useMeetupWebRTC } from '@/hooks';
import type { ActiveMeetingSession } from '@/types';

interface ActiveMeetingContainerProps {
  session: ActiveMeetingSession;
  onLeave: () => void;
}

export function ActiveMeetingContainer({ session, onLeave }: ActiveMeetingContainerProps) {
  const { user } = useAuth();
  const localMedia = useLocalMedia(true);

  const localUserId = user?.id ?? `guest-${session.date.id}`;
  const { participants, status } = useMeetupWebRTC({
    meetupId: session.date.id,
    localUserId,
    localDisplayName: session.localDisplayName,
    localAvatarUrl: user?.avatarUrl ?? '',
    isHost: Boolean(session.date.isHostedByYou),
    localStream: localMedia.localStream,
  });

  return (
    <VideoMeetingRoom
      session={session}
      participants={participants}
      localMedia={localMedia}
      connectionStatus={status}
      localUserId={localUserId}
      onLeave={onLeave}
    />
  );
}
