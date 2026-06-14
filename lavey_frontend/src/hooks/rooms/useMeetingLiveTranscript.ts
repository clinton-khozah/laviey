import { useCallback, useEffect, useRef, useState } from 'react';
import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import { meetingTranscriptService } from '@/services/rooms/meetingTranscriptService';
import type { MeetingParticipant, MeetingTranscriptEntry } from '@/types';

const CHUNK_MS = 5000;
const MAX_ENTRIES = 80;

interface UseMeetingLiveTranscriptOptions {
  enabled: boolean;
  targetLanguage: MeetingLanguageCode;
  localStream: MediaStream | null;
  participants: MeetingParticipant[];
}

function buildMixedAudioStream(
  localStream: MediaStream | null,
  participants: MeetingParticipant[],
): MediaStream | null {
  const tracks: MediaStreamTrack[] = [];
  const seen = new Set<string>();

  const addStream = (stream: MediaStream | null | undefined) => {
    stream?.getAudioTracks().forEach((track) => {
      if (track.readyState !== 'live' || !track.enabled || seen.has(track.id)) return;
      seen.add(track.id);
      tracks.push(track);
    });
  };

  addStream(localStream);
  participants.forEach((participant) => addStream(participant.stream));

  if (tracks.length === 0) return null;
  return new MediaStream(tracks);
}

function pickRecorderMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function useMeetingLiveTranscript({
  enabled,
  targetLanguage,
  localStream,
  participants,
}: UseMeetingLiveTranscriptOptions) {
  const [entries, setEntries] = useState<MeetingTranscriptEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkTimerRef = useRef<number | null>(null);
  const chunkBlobsRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const languageRef = useRef(targetLanguage);
  const streamsKeyRef = useRef('');

  enabledRef.current = enabled;
  languageRef.current = targetLanguage;

  const appendEntry = useCallback((entry: MeetingTranscriptEntry) => {
    setEntries((prev) => {
      const last = prev[0];
      if (
        last &&
        last.translatedText === entry.translatedText &&
        last.originalText === entry.originalText
      ) {
        return prev;
      }
      return [entry, ...prev].slice(0, MAX_ENTRIES);
    });
  }, []);

  const processChunk = useCallback(
    async (blob: Blob) => {
      if (processingRef.current || blob.size < 800) return;
      processingRef.current = true;
      setIsProcessing(true);
      setError(null);

      try {
        const result = await meetingTranscriptService.transcribeAudio(blob, languageRef.current);
        if (!result || !enabledRef.current) return;

        const translated = result.translatedText.trim();
        const original = result.originalText.trim();
        if (!translated || translated.startsWith('[')) {
          return;
        }

        appendEntry({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          originalText: original,
          translatedText: translated,
          detectedLanguage: result.detectedLanguage,
          createdAt: new Date().toISOString(),
          source: result.source,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not transcribe speech.';
        if (!message.toLowerCase().includes('no speech detected')) {
          setError(message);
        }
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [appendEntry],
  );

  const clearChunkTimer = useCallback(() => {
    if (chunkTimerRef.current !== null) {
      window.clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearChunkTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      recorderRef.current = null;
      setIsListening(false);
    }
  }, [clearChunkTimer]);

  const startChunkRecording = useCallback(() => {
    if (!enabledRef.current || recorderRef.current) return;

    const mixed = buildMixedAudioStream(localStream, participants);
    if (!mixed) {
      setError('Turn on your microphone to capture live captions.');
      setIsListening(false);
      return;
    }

    const mimeType = pickRecorderMimeType();
    chunkBlobsRef.current = [];

    const recorder = new MediaRecorder(mixed, { mimeType, audioBitsPerSecond: 64_000 });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunkBlobsRef.current.push(event.data);
      }
    };

    recorder.onerror = () => {
      setError('Live caption recording stopped unexpectedly.');
      stopListening();
    };

    recorder.onstop = () => {
      recorderRef.current = null;
      clearChunkTimer();

      const recorded = new Blob(chunkBlobsRef.current, { type: mimeType });
      chunkBlobsRef.current = [];

      if (recorded.size >= 800 && enabledRef.current) {
        void processChunk(recorded);
      }

      if (enabledRef.current) {
        window.setTimeout(() => startChunkRecording(), 120);
      } else {
        setIsListening(false);
      }
    };

    recorder.start();
    setIsListening(true);
    setError(null);

    chunkTimerRef.current = window.setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, CHUNK_MS);
  }, [clearChunkTimer, localStream, participants, processChunk, stopListening]);

  useEffect(() => {
    const streamsKey = `${localStream?.id ?? 'none'}:${participants.map((p) => p.id).join(',')}`;
    if (!enabled) {
      streamsKeyRef.current = streamsKey;
      stopListening();
      return;
    }

    if (!isListening || streamsKey !== streamsKeyRef.current) {
      streamsKeyRef.current = streamsKey;
      stopListening();
      startChunkRecording();
    }

    return () => stopListening();
  }, [enabled, isListening, localStream, participants, startChunkRecording, stopListening]);

  const latestEntry = entries[0] ?? null;

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  return {
    entries,
    latestEntry,
    latestDisplayText: latestEntry?.translatedText ?? '',
    isListening,
    isProcessing,
    error,
    clearEntries,
    formatTime,
  };
}
