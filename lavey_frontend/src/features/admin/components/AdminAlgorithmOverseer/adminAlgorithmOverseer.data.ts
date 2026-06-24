export type AlgorithmId = 'swipe-index' | 'affinity-proximity' | 'engagement-ai';

export type AlgorithmStatus = 'live' | 'shadow' | 'paused';

export type ResultsWindow = '7d' | '30d' | '90d';

export interface AlgorithmSignal {
  label: string;
  weight: number;
  description: string;
}

export interface AlgorithmResults {
  registrations: number;
  registrationsDelta: string;
  matches: number;
  matchesDelta: string;
  subscriptions: number;
  subscriptionsDelta: string;
  hoursOnApp: number;
  hoursOnAppDelta: string;
  matchToChatRate: number;
  retention7d: number;
  revenueAttributed: number;
  safetyReports: number;
}

export interface AlgorithmDefinition {
  id: AlgorithmId;
  name: string;
  codename: string;
  tagline: string;
  pattern: string;
  status: AlgorithmStatus;
  rollout: string;
  description: string;
  howItWorks: string[];
  signals: AlgorithmSignal[];
  guardrails: string[];
  resultsByWindow: Record<ResultsWindow, AlgorithmResults>;
}

export interface PlatformOverview {
  activeAlgorithms: number;
  liveOnApp: { id: AlgorithmId; name: string; codename: string; appliedAt: string } | null;
  avgLiftMatches: string;
  attributedRevenue30d: string;
  compare: Array<{
    id: AlgorithmId;
    name: string;
    codename: string;
    status: AlgorithmStatus;
    registrations: number;
    matches: number;
    subscriptions: number;
    hoursOnApp: number;
    retention7d: number;
  }>;
}

export const RESULT_WINDOWS: { id: ResultsWindow; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

export function getAlgorithm(algorithms: AlgorithmDefinition[], id: AlgorithmId): AlgorithmDefinition {
  const found = algorithms.find((algo) => algo.id === id);
  if (!found) throw new Error(`Algorithm ${id} not found`);
  return found;
}

export function getCompareMaxes(
  algorithms: AlgorithmDefinition[],
  window: ResultsWindow,
): { matches: number; registrations: number } {
  let matches = 1;
  let registrations = 1;
  for (const algo of algorithms) {
    const row = algo.resultsByWindow[window];
    matches = Math.max(matches, row.matches);
    registrations = Math.max(registrations, row.registrations);
  }
  return { matches, registrations };
}
