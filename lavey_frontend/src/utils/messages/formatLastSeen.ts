/** Human-readable last seen from ISO timestamp (when user is offline). */
export function formatLastSeen(lastActiveAt: string | null | undefined): string | null {
  if (!lastActiveAt) return null;

  const then = new Date(lastActiveAt);
  if (Number.isNaN(then.getTime())) return null;

  const diffMs = Date.now() - then.getTime();
  if (diffMs < 60_000) return 'Last seen just now';
  if (diffMs < 3600_000) {
    const mins = Math.max(1, Math.floor(diffMs / 60_000));
    return `Last seen ${mins}m ago`;
  }

  const now = new Date();
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();

  if (sameDay) {
    const time = then.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `Last seen today at ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday =
    then.getFullYear() === yesterday.getFullYear() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getDate() === yesterday.getDate();

  if (wasYesterday) {
    const time = then.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `Last seen yesterday at ${time}`;
  }

  return `Last seen ${then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
