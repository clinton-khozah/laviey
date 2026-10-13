import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pushApi } from "../api/services";
import { isExpoGo } from "../utils/isExpoGo";

const PRIMER_SHOWN_KEY = "@lavey/notif-primer-shown-v2";
const PRIMER_ELIGIBLE_KEY = "@lavey/notif-primer-eligible-v1";
const EAS_PROJECT_ID = "b3809907-3634-4825-8592-c25e8850322d";
const TOKEN_REGISTRATION_ATTEMPTS = 3;

const primerEligibleListeners = new Set<() => void>();

export async function markNotificationPrimerEligible(): Promise<void> {
  await AsyncStorage.setItem(PRIMER_ELIGIBLE_KEY, "1");
  primerEligibleListeners.forEach((listener) => listener());
}

export async function registerPushToken(): Promise<void> {
  if (isExpoGo() || !Device.isDevice) return;

  const Notifications = await import("expo-notifications");
  const { ensureAndroidNotificationChannels } = await import("../notifications/setupNotifications");
  let lastError: unknown;
  for (let attempt = 1; attempt <= TOKEN_REGISTRATION_ATTEMPTS; attempt += 1) {
    try {
      await ensureAndroidNotificationChannels();
      const token = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
      await pushApi.subscribeExpo(token.data, Platform.OS);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < TOKEN_REGISTRATION_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not register push notifications.");
}

/**
 * Requests notification permission after profile setup (For You gate complete).
 * Re-registers on app open and foreground for reliable background delivery.
 */
export function usePushRegistration(enabled: boolean) {
  const [primerVisible, setPrimerVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const pushSupported = enabled && !isExpoGo();

  const syncPushRegistration = useCallback(async () => {
    if (!pushSupported || !Device.isDevice) return;
    try {
      const Notifications = await import("expo-notifications");
      const existing = await Notifications.getPermissionsAsync();
      if (existing.status === "granted") {
        await registerPushToken();
      }
    } catch (error) {
      if (__DEV__) console.warn("[push] registration sync failed", error);
    }
  }, [pushSupported]);

  const maybeShowPrimer = useCallback(async () => {
    if (!pushSupported || !Device.isDevice) return;

    try {
      const Notifications = await import("expo-notifications");
      const existing = await Notifications.getPermissionsAsync();
      if (existing.status === "granted") {
        await syncPushRegistration();
        return;
      }
      if (!existing.canAskAgain) return;

      const [alreadyPrimed, eligible] = await Promise.all([
        AsyncStorage.getItem(PRIMER_SHOWN_KEY),
        AsyncStorage.getItem(PRIMER_ELIGIBLE_KEY),
      ]);
      if (alreadyPrimed || !eligible) return;
      setPrimerVisible(true);
    } catch (error) {
      if (__DEV__) console.warn("[push] permission check failed", error);
    }
  }, [pushSupported, syncPushRegistration]);

  useEffect(() => {
    void maybeShowPrimer();
    primerEligibleListeners.add(maybeShowPrimer);
    return () => {
      primerEligibleListeners.delete(maybeShowPrimer);
    };
  }, [maybeShowPrimer]);

  useEffect(() => {
    if (!pushSupported) return;

    void syncPushRegistration();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncPushRegistration();
        void maybeShowPrimer();
      }
    });

    return () => subscription.remove();
  }, [pushSupported, maybeShowPrimer, syncPushRegistration]);

  useEffect(() => {
    if (!pushSupported) return;
    let removeListener: (() => void) | undefined;
    void import("expo-notifications").then((Notifications) => {
      const subscription = Notifications.addPushTokenListener(() => {
        void registerPushToken().catch(() => undefined);
      });
      removeListener = () => subscription.remove();
    }).catch(() => undefined);
    return () => removeListener?.();
  }, [pushSupported]);

  const onAllow = async () => {
    setRequesting(true);
    try {
      await AsyncStorage.setItem(PRIMER_SHOWN_KEY, "1");
      const Notifications = await import("expo-notifications");
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      if (status === "granted") await registerPushToken();
    } catch {
      // Non-blocking when FCM or network setup is unavailable.
    } finally {
      setRequesting(false);
      setPrimerVisible(false);
    }
  };

  const onDismiss = () => {
    setPrimerVisible(false);
    void AsyncStorage.setItem(PRIMER_SHOWN_KEY, "1");
  };

  return { primerVisible, requesting, onAllow, onDismiss };
}
