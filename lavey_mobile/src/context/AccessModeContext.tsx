import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import { accessModeApi } from "../api/services";

type AccessModeValue = {
  mode: "premium_enabled" | "all_free";
  allFree: boolean;
  /** False until the first fetch resolves — lets callers hide upgrade UI instead of
   * flashing it while the real mode is still unknown. */
  ready: boolean;
  refresh(): Promise<void>;
};

const AccessModeContext = createContext<AccessModeValue>({
  mode: "all_free",
  allFree: true,
  ready: false,
  refresh: async () => undefined,
});

export function AccessModeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<AccessModeValue["mode"]>("all_free");
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await accessModeApi.get();
      setMode(result.mode);
      setReady(true);
    } catch {
      // Keep the last confirmed mode through brief network interruptions.
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const timer = setInterval(() => { void refresh().catch(() => undefined); }, 5_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh().catch(() => undefined);
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ mode, allFree: mode === "all_free", ready, refresh }),
    [mode, ready, refresh],
  );
  return <AccessModeContext.Provider value={value}>{children}</AccessModeContext.Provider>;
}

export const useAccessMode = () => useContext(AccessModeContext);
