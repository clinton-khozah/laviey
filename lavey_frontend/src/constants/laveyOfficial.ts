import { APP_IMAGES } from '@/constants/images';

export const LAVEY_OFFICIAL_CONVERSATION_ID = '__lavey_official__';

export const LAVEY_OFFICIAL_STORAGE_KEY = 'lavey:official-promo-read';

export const LAVEY_OFFICIAL_PROMO = {
  name: 'Lavey',
  logoUrl: APP_IMAGES.logo,
  headline: 'Lavey would like to offer you 10% off Platinum',
  preview: '10% off Platinum — exclusive for you',
  sentAt: 'Today',
  imageAlt: 'Lavey Platinum — 10% off',
  body:
    'Upgrade to Platinum and unlock unlimited likes, see who liked you, advanced filters, and weekly spotlight. Use your personal 10% discount today.',
  ctaLabel: 'Claim 10% off',
  discountLabel: '10% OFF',
  discountPercent: 10,
  planLabel: 'Platinum',
} as const;
