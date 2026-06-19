import { useEffect, useRef } from 'react';
import './RemoteParticipantVideo.css';

interface RemoteParticipantVideoProps {
  stream: MediaStream;
  className?: string;
}

async function bindStream(video: HTMLVideoElement, stream: MediaStream) {
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }
  try {
    await video.play();
  } catch {
    video.muted = true;
    await video.play().catch(() => {});
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
