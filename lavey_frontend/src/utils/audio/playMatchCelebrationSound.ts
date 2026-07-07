/**
 * Original synthesized match celebration — no external audio files (royalty-free).
 * Call `primeMatchAudio()` on a user gesture before async work when possible.
 */

let sharedContext: AudioContext | null = null;

export function primeMatchAudio(): void {
  if (typeof window === 'undefined') return;

  const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  if (!sharedContext) {
    sharedContext = new AudioCtx();
  }

  if (sharedContext.state === 'suspended') {
    void sharedContext.resume();
  }
}

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  primeMatchAudio();
  return sharedContext;
}

type ToneSpec = {
  frequency: number;
  start: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
  detune?: number;
};

/**
 * Short “spark + rise” jingle: two bright pings and a warm major lift.
 */
export function playMatchCelebrationSound(): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.35);
  master.connect(ctx.destination);

  const tones: ToneSpec[] = [
    { frequency: 880, start: 0, duration: 0.12, gain: 0.14, type: 'sine' },
    { frequency: 1108.73, start: 0.07, duration: 0.14, gain: 0.12, type: 'sine', detune: 4 },
    { frequency: 659.25, start: 0.16, duration: 0.22, gain: 0.16, type: 'triangle' },
    { frequency: 830.61, start: 0.24, duration: 0.24, gain: 0.14, type: 'triangle', detune: -6 },
    { frequency: 987.77, start: 0.32, duration: 0.28, gain: 0.15, type: 'sine' },
    { frequency: 1318.51, start: 0.4, duration: 0.55, gain: 0.18, type: 'sine', detune: 8 },
  ];

  for (const tone of tones) {
    const start = ctx.currentTime + tone.start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.frequency, start);
    if (tone.detune) osc.detune.setValueAtTime(tone.detune, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(start);
    osc.stop(start + tone.duration + 0.04);
  }

  // Soft sparkle layer
  const sparkle = ctx.createOscillator();
  const sparkleGain = ctx.createGain();
  sparkle.type = 'sine';
  sparkle.frequency.setValueAtTime(1760, ctx.currentTime + 0.48);
  sparkle.frequency.exponentialRampToValueAtTime(2093, ctx.currentTime + 0.72);
  sparkleGain.gain.setValueAtTime(0.0001, ctx.currentTime + 0.48);
  sparkleGain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.52);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
  sparkle.connect(sparkleGain);
  sparkleGain.connect(master);
  sparkle.start(ctx.currentTime + 0.48);
  sparkle.stop(ctx.currentTime + 0.95);
}
