let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** Playful ascending cha-ching when a gift is sent. */
export function playGiftSound() {
  const ctx = getContext();
  if (!ctx) return;

  void ctx.resume().then(() => {
    const t0 = ctx.currentTime;

    const playTone = (
      freq: number,
      start: number,
      duration: number,
      volume: number,
      type: OscillatorType = 'sine',
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    // Coin cascade — cheerful ascending arpeggio
    playTone(659.25, t0, 0.09, 0.22); // E5
    playTone(830.61, t0 + 0.07, 0.09, 0.24); // G#5
    playTone(987.77, t0 + 0.14, 0.11, 0.26); // B5
    playTone(1318.51, t0 + 0.21, 0.28, 0.28, 'triangle'); // E6 sparkle

    // Ka-ching! — two bright hits
    playTone(1760, t0 + 0.32, 0.06, 0.18, 'square');
    playTone(2217.46, t0 + 0.38, 0.35, 0.14, 'sine');
  }).catch(() => {
    /* Autoplay blocked or unsupported */
  });
}
