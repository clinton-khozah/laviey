const WELCOME_PENDING_KEY = 'lavey:platinum-welcome-pending';

export function setPlatinumWelcomePending(): void {
  try {
    sessionStorage.setItem(WELCOME_PENDING_KEY, '1');
  } catch {
    // ignore storage failures
  }
}

export function consumePlatinumWelcomePending(): boolean {
  try {
    const pending = sessionStorage.getItem(WELCOME_PENDING_KEY) === '1';
    if (pending) sessionStorage.removeItem(WELCOME_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}

export function clearPlatinumWelcomePending(): void {
  try {
    sessionStorage.removeItem(WELCOME_PENDING_KEY);
  } catch {
    // ignore
  }
}
