import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor Android/iOS shell (not mobile browser). */
export function isNativeMobileApp(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios';
}
