import { useCallback, useEffect, useState } from 'react';
import { notificationService } from '@/services/messages/notificationService';
import type { NotificationEvent } from '@/types';

export function useNotificationInbox(enabled: boolean) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (silent = false) => {
    if (!enabled) return;
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const rows = await notificationService.listNotifications();
      setNotifications(rows);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Could not load notifications');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [enabled]);

  const markRead = useCallback(async () => {
    await notificationService.markRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!enabled) return;
    const poll = window.setInterval(() => void refetch(true), 12_000);
    return () => window.clearInterval(poll);
  }, [enabled, refetch]);

  return { notifications, isLoading, error, refetch, markRead };
}
