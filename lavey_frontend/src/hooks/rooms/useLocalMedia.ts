import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface UseLocalMediaResult {
  videoRef: RefObject<HTMLVideoElement | null>;
  error: string | null;
  isLoading: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  stopMedia: () => void;
}

export function useLocalMedia(enabled: boolean): UseLocalMediaResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopMedia();
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setIsLoading(true);
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not supported in this browser.');
        setIsLoading(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setError('Allow camera and microphone access to join the meetup.');
        } else if (name === 'NotFoundError') {
          setError('No camera was found on this device.');
        } else {
          setError(err instanceof Error ? err.message : 'Could not start camera');
        }
        setIsLoading(false);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stopMedia();
    };
  }, [enabled, stopMedia]);

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

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.srcObject === stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
  });

  return {
    videoRef,
    error,
    isLoading,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    stopMedia,
  };
}
