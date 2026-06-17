import type { NotificationEvent } from '@/types';

const STORAGE_KEY = 'lavey:mock:profile-view-notifications';

interface StoredProfileViewNotification {
  id: string;
  actorUserId: string;
  actorName: string;
  actorAvatar: string;
  text: string;
  sentAt: string;
  read: boolean;
  expiresAt: string;
}

function readStore(): StoredProfileViewNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredProfileViewNotification[];
  } catch {
    return [];
  }
}

function writeStore(rows: StoredProfileViewNotification[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

/** Mock inbox row when someone views your profile (offline demos). */
export function queueMockProfileViewReceived(viewer: {
  id: string;
  name: string;
  avatar: string;
}): void {
  const first = viewer.name.trim().split(/\s+/)[0] || viewer.name;
  const row: StoredProfileViewNotification = {
    id: `profile-view-${viewer.id}-${Date.now()}`,
    actorUserId: viewer.id,
    actorName: viewer.name,
    actorAvatar: viewer.avatar,
    text: `${first} viewed your profile`,
    sentAt: 'Just now',
    read: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  writeStore([row, ...readStore()].slice(0, 40));
}

export function readMockProfileViewNotifications(): NotificationEvent[] {
  const now = Date.now();
  const active = readStore().filter((row) => new Date(row.expiresAt).getTime() > now);

  if (active.length !== readStore().length) {
    writeStore(active);
  }

  return active.map((row) => ({
    id: row.id,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    actorAvatar: row.actorAvatar,
    kind: 'profile_view',
    title: null,
    body: null,
    text: row.text,
    sentAt: row.sentAt,
    read: row.read,
    actionable: false,
    expiresAt: row.expiresAt,
  }));
}

export function markMockProfileViewsRead(): void {
  writeStore(readStore().map((row) => ({ ...row, read: true })));
}

export function notifyNotificationInboxChanged(): void {
  window.dispatchEvent(new CustomEvent('lavey:notifications-changed'));
}
