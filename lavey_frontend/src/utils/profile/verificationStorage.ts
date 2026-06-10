const STORAGE_KEY = 'lavey_profile_verified';

function readMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, boolean>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function writeMap(map: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function isProfileVerified(userId: string): boolean {
  return readMap()[userId] === true;
}

export function setProfileVerified(userId: string, verified: boolean): void {
  const map = readMap();
  if (verified) map[userId] = true;
  else delete map[userId];
  writeMap(map);
  window.dispatchEvent(
    new CustomEvent('lavey:verification-changed', { detail: { userId, verified } }),
  );
}
