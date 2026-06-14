import { useEffect, useRef } from 'react';
import { usesBackendAuth } from '@/config/env';
import { pushNotificationService } from '@/services/notifications/pushNotificationService';

/** Register Web Push after sign-in so likes / meetup alerts reach the lock screen. */
export function usePushNotifications(enabled: boolean): void {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !usesBackendAuth() || attemptedRef.current) return;
    attemptedRef.current = true;

    void pushNotificationService.register().catch(() => {
      attemptedRef.current = false;
    });
  }, [enabled]);
}
