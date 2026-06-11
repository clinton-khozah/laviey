export function profileNameInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

/** True when a URL can be used as feed/card media (not empty / placeholder). */
export function hasFeedDisplayMedia(url?: string): boolean {
  if (!url?.trim()) return false;
  const lower = url.toLowerCase();
  return (
    !lower.includes('none.jpg') &&
    !lower.includes('/none.') &&
    !lower.includes('post-templates/none')
  );
}
