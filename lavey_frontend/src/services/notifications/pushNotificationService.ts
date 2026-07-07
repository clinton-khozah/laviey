import { usesBackendApi } from "@/config/env";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import { httpClient } from "@/services/api/httpClient";
import type { ApiResponse } from "@/types";

const VAPID_STORAGE_KEY = "lavey:push:vapid-public-key";

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await httpClient.get<ApiResponse<{ publicKey: string }>>(
      API_ENDPOINTS.users.pushVapidPublicKey,
      { skipErrorPage: true },
    );
    return res.data.publicKey;
  } catch {
    return null;
  }
}

async function saveSubscriptionToBackend(
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid push subscription payload.");
  }

  await httpClient.post<ApiResponse<{ ok: boolean }>>(
    API_ENDPOINTS.users.pushSubscribe,
    {
      body: {
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
      },
      skipErrorPage: true,
    },
  );
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  return navigator.serviceWorker.ready.then(() => registration);
}

async function subscribeWithCurrentVapid(
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription();
  const storedKey = localStorage.getItem(VAPID_STORAGE_KEY);

  if (existing && storedKey && storedKey !== publicKey) {
    await existing.unsubscribe();
  }

  const current = await registration.pushManager.getSubscription();
  if (current) return current;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
}

export const pushNotificationService = {
  isSupported(): boolean {
    return isPushSupported() && usesBackendApi();
  },

  async getStatus(): Promise<PushStatus> {
    if (!this.isSupported()) {
      return { supported: false, permission: "unsupported", subscribed: false };
    }

    const permission = Notification.permission;
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();

    return {
      supported: true,
      permission,
      subscribed: Boolean(subscription),
    };
  },

  /** Sync device subscription when permission is already granted (no prompt). */
  async syncSubscription(): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== "granted")
      return false;

    try {
      const publicKey = await fetchVapidPublicKey();
      if (!publicKey) return false;

      const registration = await ensureServiceWorker();
      const subscription = await subscribeWithCurrentVapid(
        registration,
        publicKey,
      );
      await saveSubscriptionToBackend(subscription);
      localStorage.setItem(VAPID_STORAGE_KEY, publicKey);
      return true;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug("[push] sync failed", err);
      }
      return false;
    }
  },

  /** Must be called from a user tap — browsers block permission prompts otherwise. */
  async enableNotifications(): Promise<boolean> {
    if (!this.isSupported()) return false;

    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

    if (permission !== "granted") return false;
    return this.syncSubscription();
  },

  async sendTestNotification(): Promise<void> {
    await httpClient.post<ApiResponse<{ ok: boolean }>>(
      API_ENDPOINTS.users.pushTest,
      {
        skipErrorPage: true,
      },
    );
  },

  async unregister(): Promise<void> {
    if (!this.isSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => {});

    if (usesBackendApi()) {
      await httpClient.delete<ApiResponse<{ ok: boolean }>>(
        API_ENDPOINTS.users.pushSubscribe,
        {
          body: { endpoint },
          skipErrorPage: true,
        },
      );
    }

    localStorage.removeItem(VAPID_STORAGE_KEY);
  },
};
