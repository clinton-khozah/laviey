import { MeetupMediaLobby } from '@/components/rooms/MeetupMediaLobby';
import { VideoMeetingRoom } from '@/components/rooms/VideoMeetingRoom';
import { useAuth, useLocalMedia, useMeetupWebRTC } from '@/hooks';
import { meetupSocialService } from '@/services/rooms/meetupSocialService';
import type { ActiveMeetingSession } from '@/types';
import { getMeetupParticipantId } from '@/utils/meeting/meetupParticipantId';
import { useEffect } from 'react';

interface ActiveMeetingContainerProps {
  session: ActiveMeetingSession;
  onLeave: () => void;
}

export function ActiveMeetingContainer({ session, onLeave }: ActiveMeetingContainerProps) {
  const { user } = useAuth();
  const localMedia = useLocalMedia(true);

  const localUserId = getMeetupParticipantId(user?.id, session.date.id);
  const mediaReady = Boolean(localMedia.localStream);

  const { participants, status } = useMeetupWebRTC({
    meetupId: session.date.id,
    localUserId,
    localDisplayName: session.localDisplayName,
    localAvatarUrl: user?.avatarUrl ?? '',
    isHost: Boolean(session.date.isHostedByYou),
    localStream: localMedia.localStream,
    enabled: true,
    mediaReady,
  });

  useEffect(() => {
    if (!mediaReady) return;
    void meetupSocialService.reportLiveAttendance(session.date.id);
  }, [mediaReady, session.date.id]);

  const handleLeave = () => {
    localMedia.stopMedia();
    onLeave();
  };

  if (!mediaReady) {
    return (
      <MeetupMediaLobby
        session={session}
        isLoading={localMedia.isLoading}
        error={localMedia.error}
        onRetry={localMedia.retry}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <VideoMeetingRoom
      session={session}
      participants={participants}
      localMedia={localMedia}
      connectionStatus={status}
      localUserId={localUserId}
      onLeave={handleLeave}
    />
  );
}
