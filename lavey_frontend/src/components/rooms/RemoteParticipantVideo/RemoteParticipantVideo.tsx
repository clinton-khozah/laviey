import { useEffect, useRef } from 'react';
import './RemoteParticipantVideo.css';

interface RemoteParticipantVideoProps {
  stream: MediaStream;
  className?: string;
}

/** Play remote A/V — never mute (local preview is muted separately to avoid echo). */
async function bindStream(video: HTMLVideoElement, stream: MediaStream) {
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }
  video.muted = false;
  video.volume = 1;
  try {
    await video.play();
  } catch {
    /* Browser may block audio until user taps the meeting — handled by meeting-level unlock */
  }
}

export function RemoteParticipantVideo({ stream, className }: RemoteParticipantVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    void bindStream(video, stream);

    const trackListeners: Array<{ track: MediaStreamTrack; handler: () => void }> = [];

    const listenToTrack = (track: MediaStreamTrack) => {
      const handler = () => {
        void bindStream(video, stream);
      };
      track.addEventListener('mute', handler);
      track.addEventListener('unmute', handler);
      track.addEventListener('ended', handler);
      trackListeners.push({ track, handler });
    };

    for (const track of stream.getTracks()) {
      listenToTrack(track);
    }

    const onAddTrack = (event: MediaStreamTrackEvent) => {
      listenToTrack(event.track);
      void bindStream(video, stream);
    };

    const onRemoveTrack = () => {
      void bindStream(video, stream);
    };

    stream.addEventListener('addtrack', onAddTrack);
    stream.addEventListener('removetrack', onRemoveTrack);

    return () => {
      stream.removeEventListener('addtrack', onAddTrack);
      stream.removeEventListener('removetrack', onRemoveTrack);
      for (const { track, handler } of trackListeners) {
        track.removeEventListener('mute', handler);
        track.removeEventListener('unmute', handler);
        track.removeEventListener('ended', handler);
      }
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={ref}
      className={['remote-participant-video', className].filter(Boolean).join(' ')}
      autoPlay
      playsInline
    />
  );
}

/** Call after user interaction to satisfy autoplay policies for remote audio. */
export function resumeRemoteParticipantAudio(root: ParentNode | null) {
  if (!root) return;
  for (const el of root.querySelectorAll(
    'video.remote-participant-video, audio.remote-participant-audio',
  )) {
    const media = el as HTMLVideoElement | HTMLAudioElement;
    media.muted = false;
    if ('volume' in media) {
      media.volume = 1;
    }
    void media.play().catch(() => {});
  }
}
