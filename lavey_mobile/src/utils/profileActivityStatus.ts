const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const ONLINE_WINDOW_MS = 2 * MINUTE_MS;

/** Profile header activity label — hidden when last active was more than 24 hours ago. */
export function formatProfileActivityStatus(
  lastActiveAt?: string,
  isOnline?: boolean,
): string | null {
  if (isOnline) return "Online now";

  if (!lastActiveAt) return null;
  const last = new Date(lastActiveAt).getTime();
  if (Number.isNaN(last)) return null;

  const elapsed = Date.now() - last;
  if (elapsed >= DAY_MS) return null;
  if (elapsed < ONLINE_WINDOW_MS) return "Online now";

  if (elapsed < MINUTE_MS) return "Active just now";

  if (elapsed < HOUR_MS) {
    const mins = Math.max(1, Math.floor(elapsed / MINUTE_MS));
    return mins === 1 ? "1 min ago" : `${mins} min ago`;
  }

  const hours = Math.max(1, Math.floor(elapsed / HOUR_MS));
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

export function isProfileActivityOnline(
  lastActiveAt?: string,
  isOnline?: boolean,
): boolean {
  if (isOnline) return true;
  if (!lastActiveAt) return false;
  const last = new Date(lastActiveAt).getTime();
  if (Number.isNaN(last)) return false;
  return Date.now() - last < ONLINE_WINDOW_MS;
}
