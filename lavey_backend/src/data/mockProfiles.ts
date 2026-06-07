import { pickMockAvatarPath, pickMockFeedImagePath } from './mockMedia.js';

/** Temporary discover feed data until profiles are stored in Supabase. */
export const MOCK_PROFILES = [
  {
    id: '1',
    name: 'Maya',
    age: 26,
    bio: 'Sunrise hikes, bad puns, great coffee.',
    distance: '2 mi away',
    distanceKm: 3.2,
    gender: 'woman',
    verified: true,
    vibeScore: 94,
    interests: ['Hiking', 'Photography', 'Dogs'],
    avatar: pickMockAvatarPath(0),
    posts: [
      {
        id: '1a',
        type: 'image',
        src: pickMockFeedImagePath(0),
        likeCount: 194,
      },
    ],
  },
  {
    id: '2',
    name: 'Jordan',
    age: 28,
    bio: 'Live music, late-night tacos, early-morning runs.',
    distance: '5 mi away',
    distanceKm: 8.0,
    gender: 'man',
    verified: false,
    vibeScore: 88,
    interests: ['Music', 'Running', 'Food'],
    avatar: pickMockAvatarPath(1),
    posts: [
      {
        id: '2a',
        type: 'image',
        src: pickMockFeedImagePath(1),
        likeCount: 120,
      },
    ],
  },
] as const;
