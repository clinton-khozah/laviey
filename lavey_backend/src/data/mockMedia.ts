/** Local mock media paths — same files live in lavey_frontend/public/images. */
export const MOCK_MEDIA_PATHS = {
  sample: '/images/post-template-sample.jpg',
  flower: '/images/camera-filter-flower.jpg',
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

export const MOCK_AVATAR_PATHS = [
  MOCK_MEDIA_PATHS.templates.none,
  MOCK_MEDIA_PATHS.templates.singleJpg,
  MOCK_MEDIA_PATHS.templates.justFriends,
  MOCK_MEDIA_PATHS.templates.readyToMingle,
  MOCK_MEDIA_PATHS.templates.seriousRelationship,
] as const;

export const MOCK_FEED_IMAGE_PATHS = [
  MOCK_MEDIA_PATHS.sample,
  MOCK_MEDIA_PATHS.flower,
  MOCK_MEDIA_PATHS.templates.single,
  MOCK_MEDIA_PATHS.templates.openRelationship,
  MOCK_MEDIA_PATHS.templates.seriousRelationship,
  MOCK_MEDIA_PATHS.templates.justFriends,
] as const;

export function pickMockAvatarPath(index: number): string {
  return MOCK_AVATAR_PATHS[index % MOCK_AVATAR_PATHS.length];
}

export function pickMockFeedImagePath(index: number): string {
  return MOCK_FEED_IMAGE_PATHS[index % MOCK_FEED_IMAGE_PATHS.length];
}
