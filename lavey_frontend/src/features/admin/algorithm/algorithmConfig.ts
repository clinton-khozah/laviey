import { adminAlgorithmService } from '@/services/admin/adminAlgorithmService';
import type { AlgorithmId } from '@/features/admin/components/AdminAlgorithmOverseer/adminAlgorithmOverseer.data';

const CHANGE_EVENT = 'lavey-algorithm-change';

export interface AppliedAlgorithmConfig {
  id: AlgorithmId;
  appliedAt: string;
  name: string;
  codename: string;
  feedBanner: string;
}

let cachedActive: AppliedAlgorithmConfig | null = null;

export function getAppliedAlgorithm(): AppliedAlgorithmConfig | null {
  return cachedActive;
}

export async function fetchAppliedAlgorithm(): Promise<AppliedAlgorithmConfig | null> {
  try {
    const active = await adminAlgorithmService.getActive();
    if (!active) {
      cachedActive = null;
      return null;
    }
    cachedActive = {
      id: active.id,
      appliedAt: active.appliedAt,
      name: active.name,
      codename: active.codename,
      feedBanner: active.feedBanner,
    };
    return cachedActive;
  } catch {
    return cachedActive;
  }
}

export async function applyAlgorithm(id: AlgorithmId): Promise<AppliedAlgorithmConfig> {
  const active = await adminAlgorithmService.activate(id);
  const config: AppliedAlgorithmConfig = {
    id: active.id,
    appliedAt: active.appliedAt,
    name: active.name,
    codename: active.codename,
    feedBanner: active.feedBanner,
  };
  cachedActive = config;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: config }));
  return config;
}

export function clearAppliedAlgorithm(): void {
  cachedActive = null;
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

export function syncAppliedAlgorithmFromFeed(
  algorithm: {
    slug: AlgorithmId;
    name: string;
    code: string;
    feedBanner: string;
  } | null,
): void {
  if (!algorithm?.slug) return;
  const next: AppliedAlgorithmConfig = {
    id: algorithm.slug,
    appliedAt: new Date().toISOString(),
    name: algorithm.name,
    codename: algorithm.code,
    feedBanner: algorithm.feedBanner,
  };
  const unchanged =
    cachedActive?.id === next.id &&
    cachedActive.name === next.name &&
    cachedActive.feedBanner === next.feedBanner;
  if (unchanged) return;
  cachedActive = next;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
}
