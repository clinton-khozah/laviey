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

    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
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
