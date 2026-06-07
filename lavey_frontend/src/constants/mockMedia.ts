/** Local mock media served from /public/images — no external CDN required. */
export const MOCK_MEDIA = {
  sample: '/images/post-template-sample.jpg',
  flower: '/images/camera-filter-flower.jpg',
  logo: '/images/logo.png',
  templates: {
    none: '/images/templates/none.jpg',
    single: '/images/templates/single.png',
    singleJpg: '/images/templates/single.jpg',
    openRelationship: '/images/templates/openrelo.png',
    seriousRelationship: '/images/templates/relationship.png',
    justFriends: '/images/templates/just-friends.jpg',
    readyToMingle: '/images/templates/ready-to-mingle.jpg',
  },
} as const;

export const MOCK_AVATARS = [
  MOCK_MEDIA.templates.none,
  MOCK_MEDIA.templates.singleJpg,
  MOCK_MEDIA.templates.justFriends,
  MOCK_MEDIA.templates.readyToMingle,
  MOCK_MEDIA.templates.seriousRelationship,
] as const;

export const MOCK_FEED_IMAGES = [
  MOCK_MEDIA.sample,
  MOCK_MEDIA.flower,
  MOCK_MEDIA.templates.single,
  MOCK_MEDIA.templates.openRelationship,
  MOCK_MEDIA.templates.seriousRelationship,
  MOCK_MEDIA.templates.justFriends,
] as const;

export function pickMockAvatar(index: number): string {
  return MOCK_AVATARS[index % MOCK_AVATARS.length];
}

export function pickMockFeedImage(index: number): string {
  return MOCK_FEED_IMAGES[index % MOCK_FEED_IMAGES.length];
}
