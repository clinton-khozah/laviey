type CallToneKind = 'incoming' | 'outgoing';

let audioContext: AudioContext | null = null;
let stopCurrentTone: (() => void) | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

/** Unlock call audio during a user gesture so later incoming calls may ring. */
export function primeCallAudio(): void {
  const context = getAudioContext();
  if (context?.state === 'suspended') void context.resume();
}

interface Note {
  frequency: number;
  offset: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
}

const LAVEY_INCOMING_MELODY: Note[] = [
  { frequency: 659.25, offset: 0, duration: 0.18, volume: 0.13, type: 'sine' },
  { frequency: 830.61, offset: 0.18, duration: 0.18, volume: 0.14, type: 'triangle' },
  { frequency: 987.77, offset: 0.36, duration: 0.26, volume: 0.15, type: 'sine' },
  { frequency: 830.61, offset: 0.68, duration: 0.17, volume: 0.12, type: 'triangle' },
  { frequency: 1318.51, offset: 0.86, duration: 0.42, volume: 0.14, type: 'sine' },
];

const OUTGOING_RINGBACK: Note[] = [
  { frequency: 440, offset: 0, duration: 0.82, volume: 0.07, type: 'sine' },
  { frequency: 480, offset: 0, duration: 0.82, volume: 0.05, type: 'sine' },
];

export function startCallRingtone(kind: CallToneKind): () => void {
  stopCurrentTone?.();

  const context = getAudioContext();
  if (!context) return () => {};

  let active = true;
  let intervalId: number | null = null;
  let vibrationIntervalId: number | null = null;
  const oscillators = new Set<OscillatorNode>();
  const melody = kind === 'incoming' ? LAVEY_INCOMING_MELODY : OUTGOING_RINGBACK;
  const repeatEveryMs = kind === 'incoming' ? 2600 : 3000;

  const playPattern = () => {
    if (!active || context.state !== 'running') return;
    const now = context.currentTime + 0.02;
    for (const note of melody) {
      const start = now + note.offset;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = note.type ?? 'sine';
      oscillator.frequency.setValueAtTime(note.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(note.volume, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillators.add(oscillator);
      oscillator.onended = () => oscillators.delete(oscillator);
      oscillator.start(start);
      oscillator.stop(start + note.duration + 0.04);
    }
  };

  void context.resume().then(() => {
    if (!active) return;
    playPattern();
    intervalId = window.setInterval(playPattern, repeatEveryMs);
  }).catch(() => {
    // Some browsers require one tap anywhere in the app before audio can start.
  });

  if (kind === 'incoming' && 'vibrate' in navigator) {
    navigator.vibrate([450, 180, 450, 650]);
    vibrationIntervalId = window.setInterval(
      () => navigator.vibrate([450, 180, 450, 650]),
      repeatEveryMs,
    );
  }

  const stop = () => {
    if (!active) return;
    active = false;
    if (intervalId !== null) window.clearInterval(intervalId);
    if (vibrationIntervalId !== null) window.clearInterval(vibrationIntervalId);
    for (const oscillator of oscillators) {
      try {
        oscillator.stop();
      } catch {
        // The scheduled note may already have ended.
      }
    }
    oscillators.clear();
    if (kind === 'incoming' && 'vibrate' in navigator) navigator.vibrate(0);
    if (stopCurrentTone === stop) stopCurrentTone = null;
  };

  stopCurrentTone = stop;
  return stop;
}
