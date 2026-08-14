import { useEffect } from "react";
import { AppState } from "react-native";
import { syncUserLocation } from "../utils/syncUserLocation";

/** Keeps the signed-in user's coordinates and city/country fresh for nearby discovery. */
export function useLocationSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      void syncUserLocation().catch(() => undefined);
    };

    run();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });

    return () => subscription.remove();
  }, [enabled]);
}
