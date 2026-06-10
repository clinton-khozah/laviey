import { useEffect, useRef } from 'react';
import './RemoteParticipantVideo.css';

interface RemoteParticipantVideoProps {
  stream: MediaStream;
  className?: string;
}

export function RemoteParticipantVideo({ stream, className }: RemoteParticipantVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
    return () => {
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
