import { chatApi } from "../api/services";
import type { NotificationEvent } from "../types";

let cached: NotificationEvent[] | null = null;
let pending: Promise<NotificationEvent[]> | null = null;

export function peekNotifications(): NotificationEvent[] {
  return cached ?? [];
}

/** Starts the inbox request early so the list is ready when the sheet opens. */
export function loadNotifications(): Promise<NotificationEvent[]> {
  if (pending) return pending;
  pending = chatApi
    .notifications()
    .then((next) => {
      cached = next;
      pending = null;
      return next;
    })
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}
