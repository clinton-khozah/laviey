import { getSharedAudioContext } from '@/utils/audio/playMatchCelebrationSound';

/**
 * Short, bright plink used for a successful like on the For You feed.
 */
export function playLikeFeedbackSound(): void {
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
  master.connect(ctx.destination);

  const first = ctx.createOscillator();
  const firstGain = ctx.createGain();
  first.type = 'triangle';
  first.frequency.setValueAtTime(880, t0);
  firstGain.gain.setValueAtTime(0.0001, t0);
  firstGain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.01);
  firstGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  first.connect(firstGain);
  firstGain.connect(master);
  first.start(t0);
  first.stop(t0 + 0.16);

  const second = ctx.createOscillator();
  const secondGain = ctx.createGain();
  second.type = 'sine';
  second.frequency.setValueAtTime(1320, t0 + 0.05);
  secondGain.gain.setValueAtTime(0.0001, t0 + 0.05);
  secondGain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.06);
  secondGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
  second.connect(secondGain);
  secondGain.connect(master);
  second.start(t0 + 0.05);
  second.stop(t0 + 0.24);
}
