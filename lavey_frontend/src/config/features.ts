/** When true, Platinum-gated UI (likes list, quotas, etc.) is unlocked for everyone. */
export const UNLOCK_PREMIUM_FEATURES = true;

export function hasPremiumAccess(isPremiumAccount = false): boolean {
  return UNLOCK_PREMIUM_FEATURES || isPremiumAccount;
}
