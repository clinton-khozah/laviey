export function profileNameInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

/** Stock template / empty paths — not real user-uploaded media. */
export function isPlaceholderMediaUrl(url?: string): boolean {
  if (!url?.trim()) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('none.jpg') ||
    lower.includes('/none.') ||
    lower.includes('post-templates/none') ||
    lower.includes('post-templates%2fnone') ||
    lower.includes('/images/templates/') ||
    lower.includes('/images/post-template')
  );
}

/** True when a URL can be used as feed/card media (not empty / placeholder). */
export function hasFeedDisplayMedia(url?: string): boolean {
  return !isPlaceholderMediaUrl(url);
}
