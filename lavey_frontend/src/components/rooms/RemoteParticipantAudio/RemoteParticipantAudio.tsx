import { useEffect, useRef } from 'react';
import './RemoteParticipantAudio.css';

interface RemoteParticipantAudioProps {
  stream: MediaStream;
}

/** Plays remote mic when video tile is hidden (camera off). */
export function RemoteParticipantAudio({ stream }: RemoteParticipantAudioProps) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;

    audio.srcObject = stream;
    audio.muted = false;
    void audio.play().catch(() => {});

    const onTrackChange = () => {
      if (audio.srcObject !== stream) {
        audio.srcObject = stream;
      }
      void audio.play().catch(() => {});
    };

    stream.addEventListener('addtrack', onTrackChange);
    stream.addEventListener('removetrack', onTrackChange);

    return () => {
      stream.removeEventListener('addtrack', onTrackChange);
      stream.removeEventListener('removetrack', onTrackChange);
      audio.srcObject = null;
    };
  }, [stream]);

  return <audio ref={ref} autoPlay playsInline className="remote-participant-audio" />;
}
