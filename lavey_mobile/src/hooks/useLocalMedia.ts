import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaDevices, MediaStream } from 'react-native-webrtc';

interface UseLocalMediaResult {
  localStream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  stopMedia: () => void;
  retry: () => void;
}

export function useLocalMedia(enabled: boolean): UseLocalMediaResult {
  const streamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLocalStream(null);
  }, []);

  const retry = useCallback(() => {
    stopMedia();
    setError(null);
    setAttempt((value) => value + 1);
  }, [stopMedia]);

  useEffect(() => {
    if (!enabled) {
      stopMedia();
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setIsLoading(true);
      setError(null);

      try {
        const stream = (await mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user' },
        })) as unknown as MediaStream;

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        console.log(
          '[localMedia] getUserMedia OK',
          'streamId:',
          stream.id,
          'tracks:',
          stream.getTracks().map((t) => `${t.kind}:enabled=${t.enabled}:readyState=${t.readyState}`),
        );

        streamRef.current = stream;
        setLocalStream(stream);
        setIsVideoEnabled(stream.getVideoTracks().some((track) => track.enabled));
        setIsAudioEnabled(stream.getAudioTracks().some((track) => track.enabled));
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.log('[localMedia] getUserMedia FAILED', err);
        setError(err instanceof Error ? err.message : 'Allow camera and microphone access to join the date.');
        setIsLoading(false);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stopMedia();
    };
  }, [enabled, attempt, stopMedia]);

  const toggleVideo = useCallback(() => {
    const tracks = streamRef.current?.getVideoTracks() ?? [];
    const next = !isVideoEnabled;
    tracks.forEach((track) => {
      track.enabled = next;
    });
    setIsVideoEnabled(next);
  }, [isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() ?? [];
    const next = !isAudioEnabled;
    tracks.forEach((track) => {
      track.enabled = next;
    });
    setIsAudioEnabled(next);
  }, [isAudioEnabled]);

  return {
    localStream,
    error,
    isLoading,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    stopMedia,
    retry,
  };
}
