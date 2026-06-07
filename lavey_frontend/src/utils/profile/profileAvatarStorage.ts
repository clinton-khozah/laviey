const KEY_PREFIX = 'lavey_profile_avatar_';

export function getStoredProfileAvatar(userId: string): string | null {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export function setStoredProfileAvatar(userId: string, dataUrl: string): void {
  localStorage.setItem(`${KEY_PREFIX}${userId}`, dataUrl);
}

export function clearStoredProfileAvatar(userId: string): void {
  localStorage.removeItem(`${KEY_PREFIX}${userId}`);
}
