import { useEffect, useRef } from 'react';
import './RemoteParticipantVideo.css';

interface RemoteParticipantVideoProps {
  stream: MediaStream;
  className?: string;
}

function bindStream(video: HTMLVideoElement, stream: MediaStream) {
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }
  video.muted = false;
  void video.play().catch(() => {});
}

export function RemoteParticipantVideo({ stream, className }: RemoteParticipantVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    bindStream(video, stream);

    const handleTrackChange = () => bindStream(video, stream);
    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);

    const trackListeners: Array<{ track: MediaStreamTrack; handler: () => void }> = [];
    for (const track of stream.getTracks()) {
      const handler = () => bindStream(video, stream);
      track.addEventListener('mute', handler);
      track.addEventListener('unmute', handler);
      trackListeners.push({ track, handler });
    }

    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
      for (const { track, handler } of trackListeners) {
        track.removeEventListener('mute', handler);
        track.removeEventListener('unmute', handler);
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
