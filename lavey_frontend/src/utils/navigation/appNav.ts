import type { NavItemId } from '@/constants/navigation';

export function navigateAppTo(nav: NavItemId): void {
  window.dispatchEvent(new CustomEvent('lavey:navigate', { detail: { nav } }));
}

/** Opens Messages and selects the thread for this profile (if it exists). */
export function openChatWithProfile(profileId: string): void {
  window.sessionStorage.setItem('lavey:openChatProfileId', profileId);
  navigateAppTo('messages');
}

