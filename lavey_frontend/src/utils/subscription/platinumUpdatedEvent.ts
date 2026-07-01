export const PLATINUM_UPDATED_EVENT = 'lavey:platinum-updated';

export function notifyPlatinumUpdated(): void {
  window.dispatchEvent(new Event(PLATINUM_UPDATED_EVENT));
}
