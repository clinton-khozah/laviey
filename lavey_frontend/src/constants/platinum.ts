import type { PlatinumCatalog } from '@/types';

/** Offline / mock fallback — kept in sync with DB seed in 014_platinum_catalog.sql */
export const FALLBACK_PLATINUM_CATALOG: PlatinumCatalog = {
  sheetTitle: 'Platinum',
  heroTitle: 'Go Platinum',
  heroTagline: "Match faster, see who's into you, and stand out every week on Lavey.",
  starEmoji: '★',
  defaultPlanId: 'month',
  oneTimeFinePrint: 'One-time access for 24 hours. No auto-renew in demo.',
  recurringFinePrint: 'Recurring billing. Cancel anytime in Settings. Free trial not available in demo.',
  plans: [
    { id: 'day', label: '1 day', price: 'R11.99', period: 'one-time' },
    { id: 'week', label: 'Weekly', price: 'R49.99', period: '/ week', badge: 'Try it' },
    {
      id: 'month',
      label: 'Monthly',
      price: 'R149.99',
      period: '/ month',
      badge: 'Most popular',
      popular: true,
    },
  ],
  features: [
    {
      id: 'likes',
      title: 'See who liked you',
      description: 'Unlock every like — names, photos, and vibe scores. No more guessing.',
    },
    {
      id: 'crushes',
      title: 'Unlimited daily crushes',
      description: 'Send as many likes as you want. Never hit the daily limit again.',
    },
    {
      id: 'views',
      title: 'See who viewed your vibes',
      description: 'Know who watched your clips and how often they came back.',
    },
    {
      id: 'filters',
      title: 'Advanced discovery filters',
      description: 'Filter by age, distance, and who you want to meet.',
    },
    {
      id: 'ai',
      title: '1 AI profile review / month',
      description: 'Get tips on photos, bio, and vibes so you match with the right people.',
    },
    {
      id: 'spotlight',
      title: 'Weekly profile spotlight',
      description: 'Jump to the top of For You once a week and get seen first.',
    },
    {
      id: 'ecoffee',
      title: 'Unlimited E-Coffee',
      description: 'Send as many virtual coffees as you want to start conversations.',
    },
    {
      id: 'rewind',
      title: 'Rewind last pass',
      description: 'Accidentally skipped someone? Bring them back with one tap.',
    },
  ],
  displayCurrency: 'ZAR',
  billingCurrency: 'ZAR',
  pricingNote: null,
};

/** @deprecated Use platinumService.getCatalog() — admin-only convenience */
export const PLATINUM_PLANS = FALLBACK_PLATINUM_CATALOG.plans;
/** @deprecated Use platinumService.getCatalog() */
export const PLATINUM_FEATURES = FALLBACK_PLATINUM_CATALOG.features;
export const DEFAULT_PLATINUM_PLAN_ID = FALLBACK_PLATINUM_CATALOG.defaultPlanId;

export type PlatinumPlanId = string;

export function getPlatinumPlan(id: string, catalog = FALLBACK_PLATINUM_CATALOG) {
  return catalog.plans.find((p) => p.id === id) ?? catalog.plans.find((p) => p.id === catalog.defaultPlanId) ?? catalog.plans[0];
}
