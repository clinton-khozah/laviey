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

export const RESULT_WINDOWS: { id: ResultsWindow; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

export const ALGORITHMS: AlgorithmDefinition[] = [
  {
    id: 'swipe-index',
    name: 'Swipe Index',
    codename: 'INDEX_MY_INDEX',
    tagline: 'TikTok-style discovery rank for the swipe deck',
    pattern: 'For You · swipe feed',
    status: 'live',
    rollout: '100% of swipe sessions in ZA metros',
    description:
      'Ranks who appears next when a member swipes. Blends engagement velocity, profile quality, and mutual-interest momentum—similar to a short-form feed, but optimized for dating intent.',
    howItWorks: [
      'Builds a personal index per member from swipe history, dwell time, and super-like patterns.',
      'Re-ranks the deck every session using recency decay so stale profiles sink.',
      'Boosts profiles with high reply probability after a mutual match.',
      'Applies diversity rules so the deck is not repetitive in a single session.',
    ],
    signals: [
      { label: 'Swipe-through rate', weight: 28, description: 'How often this profile gets right swipes' },
      { label: 'Profile depth score', weight: 22, description: 'Photos, bio, prompts, verification' },
      { label: 'Session momentum', weight: 18, description: 'Recent activity and return visits' },
      { label: 'Mutual intent score', weight: 16, description: 'Predicted two-way interest' },
      { label: 'Freshness boost', weight: 10, description: 'New members in their first 72h' },
      { label: 'Diversity penalty', weight: 6, description: 'Prevents same archetype repetition' },
    ],
    guardrails: [
      'Never surface blocked or previously reported accounts',
      'Cap repeat impressions to 2 per 24h',
      'Hard-filter incompatible age and distance preferences',
    ],
    resultsByWindow: {
      '7d': {
        registrations: 842,
        registrationsDelta: '+11.4%',
        matches: 12840,
        matchesDelta: '+8.2%',
        subscriptions: 196,
        subscriptionsDelta: '+14',
        hoursOnApp: 48200,
        hoursOnAppDelta: '+9.1%',
        matchToChatRate: 61,
        retention7d: 44,
        revenueAttributed: 218400,
        safetyReports: 12,
      },
      '30d': {
        registrations: 3640,
        registrationsDelta: '+9.8%',
        matches: 52840,
        matchesDelta: '+7.4%',
        subscriptions: 812,
        subscriptionsDelta: '+62',
        hoursOnApp: 198600,
        hoursOnAppDelta: '+8.3%',
        matchToChatRate: 58,
        retention7d: 41,
        revenueAttributed: 892000,
        safetyReports: 47,
      },
      '90d': {
        registrations: 10820,
        registrationsDelta: '+12.1%',
        matches: 158200,
        matchesDelta: '+9.0%',
        subscriptions: 2410,
        subscriptionsDelta: '+188',
        hoursOnApp: 592400,
        hoursOnAppDelta: '+10.2%',
        matchToChatRate: 57,
        retention7d: 39,
        revenueAttributed: 2648000,
        safetyReports: 138,
      },
    },
  },
  {
    id: 'affinity-proximity',
    name: 'Affinity & Proximity',
    codename: 'COMMON_GROUND',
    tagline: 'Best-match suggestions from shared data + distance',
    pattern: 'Smart suggestions · compatibility',
    status: 'live',
    rollout: '92% suggestion rail · 8% holdout control',
    description:
      'Finds the best people for each member by scoring overlap in interests, lifestyle tags, values, and practical distance—then surfaces them in Suggested for You and post-swipe nudges.',
    howItWorks: [
      'Embeds profile tags, quiz answers, and stated preferences into a compatibility vector.',
      'Combines cosine similarity with geo tiers (same city, <25km, <100km).',
      'Penalizes low-effort profiles and inactive accounts.',
      'Re-scores nightly and after major profile updates.',
    ],
    signals: [
      { label: 'Interest overlap', weight: 26, description: 'Shared hobbies, music, lifestyle tags' },
      { label: 'Values alignment', weight: 20, description: 'Relationship intent, family, lifestyle' },
      { label: 'Distance tier', weight: 24, description: 'Geo proximity with member max distance' },
      { label: 'Availability overlap', weight: 12, description: 'Active hours and response windows' },
      { label: 'Conversation fit', weight: 10, description: 'Predicted message compatibility' },
      { label: 'Verification trust', weight: 8, description: 'Verified photos and low report history' },
    ],
    guardrails: [
      'Respect explicit deal-breakers (age, distance, gender preference)',
      'Minimum compatibility floor before showing in suggestions',
      'Explainability snapshot stored for admin audit',
    ],
    resultsByWindow: {
      '7d': {
        registrations: 620,
        registrationsDelta: '+7.2%',
        matches: 9840,
        matchesDelta: '+12.6%',
        subscriptions: 168,
        subscriptionsDelta: '+11',
        hoursOnApp: 39600,
        hoursOnAppDelta: '+6.4%',
        matchToChatRate: 68,
        retention7d: 48,
        revenueAttributed: 186200,
        safetyReports: 8,
      },
      '30d': {
        registrations: 2810,
        registrationsDelta: '+8.1%',
        matches: 41200,
        matchesDelta: '+11.2%',
        subscriptions: 704,
        subscriptionsDelta: '+54',
        hoursOnApp: 164200,
        hoursOnAppDelta: '+7.1%',
        matchToChatRate: 65,
        retention7d: 46,
        revenueAttributed: 768400,
        safetyReports: 31,
      },
      '90d': {
        registrations: 8420,
        registrationsDelta: '+9.4%',
        matches: 124600,
        matchesDelta: '+10.8%',
        subscriptions: 2088,
        subscriptionsDelta: '+164',
        hoursOnApp: 488200,
        hoursOnAppDelta: '+8.6%',
        matchToChatRate: 63,
        retention7d: 44,
        revenueAttributed: 2284000,
        safetyReports: 94,
      },
    },
  },
  {
    id: 'engagement-ai',
    name: 'Engagement Companion AI',
    codename: 'SPARK_COMPANIONS',
    tagline: 'AI personas for cold-start warmth (admin-only visibility)',
    pattern: 'Companion pool · invisible engagement layer',
    status: 'shadow',
    rollout: '18% of new members · phased ramp',
    description:
      'Imports AI companion profiles that match and message like real members during low-supply hours. Members experience organic momentum; this panel tracks lift without exposing the layer in product UI.',
    howItWorks: [
      'Deploys curated AI personas with realistic photos, bios, and reply styles.',
      'Triggers timed matches when a member has low match velocity in first 48h.',
      'Opens conversations with context-aware starters tied to profile overlap.',
      'Hands off to real members once natural match flow exceeds threshold.',
    ],
    signals: [
      { label: 'Cold-start detection', weight: 30, description: 'Low matches in first 48h' },
      { label: 'Persona fit score', weight: 22, description: 'Persona aligned to member tags' },
      { label: 'Reply latency model', weight: 18, description: 'Human-like response timing' },
      { label: 'Session extension', weight: 16, description: 'Keeps member in app longer' },
      { label: 'Handoff readiness', weight: 10, description: 'When to reduce AI exposure' },
      { label: 'Safety classifier', weight: 4, description: 'Blocks harmful or explicit paths' },
    ],
    guardrails: [
      'Never request money, off-platform contact, or explicit content',
      'Auto-sunset AI thread after member gets 3+ real mutual matches',
      'Full transcript logging for compliance review',
      'Hard cap: max 2 AI-initiated matches per member per week',
    ],
    resultsByWindow: {
      '7d': {
        registrations: 1240,
        registrationsDelta: '+18.6%',
        matches: 18600,
        matchesDelta: '+22.4%',
        subscriptions: 142,
        subscriptionsDelta: '+9',
        hoursOnApp: 62400,
        hoursOnAppDelta: '+15.8%',
        matchToChatRate: 74,
        retention7d: 52,
        revenueAttributed: 142800,
        safetyReports: 3,
      },
      '30d': {
        registrations: 4920,
        registrationsDelta: '+16.2%',
        matches: 72400,
        matchesDelta: '+19.8%',
        subscriptions: 548,
        subscriptionsDelta: '+38',
        hoursOnApp: 248800,
        hoursOnAppDelta: '+14.2%',
        matchToChatRate: 71,
        retention7d: 49,
        revenueAttributed: 568000,
        safetyReports: 11,
      },
      '90d': {
        registrations: 14680,
        registrationsDelta: '+17.1%',
        matches: 214200,
        matchesDelta: '+18.4%',
        subscriptions: 1624,
        subscriptionsDelta: '+112',
        hoursOnApp: 742000,
        hoursOnAppDelta: '+13.6%',
        matchToChatRate: 69,
        retention7d: 47,
        revenueAttributed: 1684000,
        safetyReports: 28,
      },
    },
  },
];

export const PLATFORM_ALGORITHM_KPIS = {
  activeAlgorithms: 3,
  liveExperiments: 2,
  avgLiftMatches: '+11.2%',
  attributedRevenue30d: 'R 2.43m',
};

export function getAlgorithm(id: AlgorithmId): AlgorithmDefinition {
  return ALGORITHMS.find((algo) => algo.id === id) ?? ALGORITHMS[0];
}

/** Daily trend points for charts (last 14 days, mock). */
export function getCompareMaxes(window: ResultsWindow) {
  return ALGORITHMS.reduce(
    (acc, algo) => {
      const row = algo.resultsByWindow[window];
      return {
        matches: Math.max(acc.matches, row.matches),
        registrations: Math.max(acc.registrations, row.registrations),
      };
    },
    { matches: 1, registrations: 1 },
  );
}

export const ALGORITHM_TREND_SERIES: Record<
  AlgorithmId,
  { label: string; matches: number[]; registrations: number[]; hours: number[] }
> = {
  'swipe-index': {
    label: 'Matches',
    matches: [820, 880, 910, 940, 1020, 1080, 1120, 1180, 1210, 1240, 1280, 1310, 1340, 1380],
    registrations: [42, 48, 51, 55, 58, 62, 64, 68, 70, 72, 75, 78, 80, 84],
    hours: [2800, 2950, 3100, 3200, 3350, 3480, 3600, 3720, 3850, 3920, 4000, 4120, 4200, 4350],
  },
  'affinity-proximity': {
    label: 'Matches',
    matches: [720, 760, 800, 840, 890, 920, 960, 1010, 1040, 1080, 1120, 1160, 1190, 1240],
    registrations: [38, 40, 44, 46, 50, 52, 56, 58, 60, 63, 66, 68, 71, 74],
    hours: [2400, 2520, 2650, 2780, 2900, 3020, 3150, 3280, 3400, 3520, 3650, 3780, 3900, 4050],
  },
  'engagement-ai': {
    label: 'Matches',
    matches: [980, 1040, 1120, 1180, 1260, 1340, 1420, 1500, 1580, 1660, 1720, 1780, 1840, 1920],
    registrations: [52, 58, 64, 70, 76, 82, 88, 94, 100, 108, 114, 120, 126, 132],
    hours: [3200, 3400, 3650, 3900, 4100, 4350, 4600, 4850, 5100, 5350, 5600, 5850, 6100, 6400],
  },
};
