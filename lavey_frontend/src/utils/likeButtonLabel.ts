/** Label for the heart / like action on discover feed */
export function getLikeButtonLabel(liked: boolean, likedYou?: boolean): string {
  if (liked && likedYou) return 'Matched!';
  if (liked) return 'Sent';
  return 'Like';
}
