import { getAlgorithm, type AlgorithmId } from '@/features/admin/components/AdminAlgorithmOverseer/adminAlgorithmOverseer.data';
import type { Profile } from '@/types';

const STORAGE_KEY = 'lavey_active_algorithm_v1';
const CHANGE_EVENT = 'lavey-algorithm-change';

export interface AppliedAlgorithmConfig {
  id: AlgorithmId;
  appliedAt: string;
  name: string;
  codename: string;
  feedBanner: string;
}

export function getAppliedAlgorithm(): AppliedAlgorithmConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppliedAlgorithmConfig;
  } catch {
    return null;
  }
}

export function applyAlgorithm(id: AlgorithmId): AppliedAlgorithmConfig {
  const algo = getAlgorithm(id);
  const config: AppliedAlgorithmConfig = {
    id,
    appliedAt: new Date().toISOString(),
    name: algo.name,
    codename: algo.codename,
    feedBanner: algo.pattern,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: config }));
  return config;
}

export function clearAppliedAlgorithm(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: null }));
}

export function subscribeAlgorithmChange(listener: (config: AppliedAlgorithmConfig | null) => void): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<AppliedAlgorithmConfig | null>;
    listener(custom.detail ?? getAppliedAlgorithm());
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/** Re-order discover feed mock data to reflect the active algorithm. */
export function sortProfilesByAlgorithm(profiles: Profile[], algorithmId: AlgorithmId): Profile[] {
  const list = [...profiles];

  if (algorithmId === 'swipe-index') {
    return list.sort((a, b) => (b.vibeScore ?? 0) - (a.vibeScore ?? 0));
  }

  if (algorithmId === 'affinity-proximity') {
    return list.sort((a, b) => {
      const scoreA = (a.verified ? 20 : 0) + (a.vibeScore ?? 0) * 0.6 + (a.age % 5);
      const scoreB = (b.verified ? 20 : 0) + (b.vibeScore ?? 0) * 0.6 + (b.age % 5);
      return scoreB - scoreA;
    });
  }

  // engagement-ai: prioritize profiles likely to reply (likedYou, verified) for warmth
  return list.sort((a, b) => {
    const warmA = (a.likedYou ? 30 : 0) + (a.verified ? 10 : 0) + (a.vibeScore ?? 0) * 0.3;
    const warmB = (b.likedYou ? 30 : 0) + (b.verified ? 10 : 0) + (b.vibeScore ?? 0) * 0.3;
    return warmB - warmA;
  });
}
