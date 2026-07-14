import { useEffect, useRef } from 'react';
import { RemoteParticipantVideo, resumeRemoteParticipantAudio } from '@/components/rooms/RemoteParticipantVideo';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { useAuth, useLocalMedia, useMeetupWebRTC, useUserProfile } from '@/hooks';
import type { ChatVideoCall } from '@/types';
import { startCallRingtone } from '@/utils/audio/callRingtone';
import { getMeetupParticipantId } from '@/utils/meeting/meetupParticipantId';
import './DirectVideoCall.css';

interface DirectVideoCallProps {
  call: ChatVideoCall;
  onEnd: () => void;
}

export function DirectVideoCall({ call, onEnd }: DirectVideoCallProps) {
  const callRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const media = useLocalMedia(true);
  const roomId = `chat-video-call:${call.id}`;
  const localUserId = getMeetupParticipantId(user?.id, roomId);
  const localName = profile?.displayName || user?.displayName || 'You';
  const { participants, status } = useMeetupWebRTC({
    meetupId: roomId,
    localUserId,
    localDisplayName: localName,
    localAvatarUrl: profile?.avatarUrl || user?.avatarUrl || '',
    isHost: call.direction === 'outgoing',
    localStream: media.localStream,
    enabled: Boolean(media.localStream),
    mediaReady: Boolean(media.localStream),
  });
  const participant = participants[0];

  useEffect(() => {
    if (!participant?.stream) return;
    resumeRemoteParticipantAudio(callRef.current);
  }, [participant?.stream]);

  useEffect(() => {
    if (call.direction !== 'outgoing' || call.status !== 'ringing' || participant) return;
    return startCallRingtone('outgoing');
  }, [call.direction, call.status, participant]);

  const finish = () => {
    media.stopMedia();
    onEnd();
  };

  return (
    <AppOverlay>
      <section
        ref={callRef}
        className="direct-video-call"
        aria-label={`Video call with ${call.participantName}`}
        onPointerDown={() => resumeRemoteParticipantAudio(callRef.current)}
      >
        <header className="direct-video-call__header">
          <div>
            <h2>{call.participantName}</h2>
            <p>
              {status === 'unsupported'
                ? 'Live video is unavailable in this browser'
                : participant
                  ? 'Connected'
                  : call.status === 'ringing'
                    ? 'Ringing…'
                    : 'Connecting…'}
            </p>
          </div>
          <span className={`direct-video-call__secure ${participant ? 'direct-video-call__secure--live' : ''}`}>
            {participant ? 'Live' : 'Private'}
          </span>
        </header>

        <div className="direct-video-call__stage">
          {participant?.stream ? (
            <>
              <RemoteParticipantVideo
                stream={participant.stream}
                className={`direct-video-call__remote ${participant.isVideoOff ? 'direct-video-call__remote--off' : ''}`}
              />
              {participant.isVideoOff ? (
                <div className="direct-video-call__remote-placeholder">
                  {participant.avatarUrl ? <img src={participant.avatarUrl} alt="" /> : null}
                  <strong>{participant.name}</strong>
                  <span>Camera is off</span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="direct-video-call__waiting">
              {call.participantAvatar ? (
                <img src={call.participantAvatar} alt="" />
              ) : (
                <span className="direct-video-call__waiting-fallback" aria-hidden>
                  {call.participantName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="direct-video-call__ring" aria-hidden />
              <strong>{call.status === 'ringing' ? `Calling ${call.participantName}…` : 'Connecting your call…'}</strong>
              <small>{call.status === 'ringing' ? 'Waiting for them to answer' : 'Setting up private video'}</small>
            </div>
          )}

          <div className="direct-video-call__self">
            {media.error ? (
              <div className="direct-video-call__self-message">
                <span>!</span>
                <button type="button" onClick={media.retry}>Try again</button>
              </div>
            ) : (
              <video
                ref={media.videoRef}
                className={!media.isVideoEnabled ? 'direct-video-call__self-video--off' : ''}
                autoPlay
                playsInline
                muted
              />
            )}
            {!media.error && !media.isVideoEnabled ? (
              <span className="direct-video-call__self-off">{localName.charAt(0).toUpperCase()}</span>
            ) : null}
          </div>
        </div>

        {media.error ? <p className="direct-video-call__media-error">{media.error}</p> : null}

        <footer className="direct-video-call__controls">
          <button type="button" className={!media.isAudioEnabled ? 'is-off' : ''} onClick={media.toggleAudio} aria-label={media.isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {media.isAudioEnabled ? <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8" /> : <path d="M3 3l18 18M9 9v3a3 3 0 004.7 2.5M15 10V5a3 3 0 00-5.6-1.5M19 10v2a7 7 0 01-11.2 5.6M12 19v3M8 22h8" />}
            </svg>
          </button>
          <button type="button" className="direct-video-call__end" onClick={finish} aria-label="End call">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" aria-hidden>
              <path d="M4 15.5c4.8-4.6 11.2-4.6 16 0l-2.8 3-3-2.2V13h-4.4v3.3l-3 2.2-2.8-3z" />
            </svg>
          </button>
          <button type="button" className={!media.isVideoEnabled ? 'is-off' : ''} onClick={media.toggleVideo} aria-label={media.isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 10l4.6-2.3A1 1 0 0121 8.6v6.8a1 1 0 01-1.4.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </footer>
      </section>
    </AppOverlay>
  );
}
