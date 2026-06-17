import { useEffect, useRef } from "react";
import { AppLoader } from "@/components/ui/AppLoader";
import { apiConfig } from "@/config/api.config";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import { useAuth } from "@/hooks";
import { authService } from "@/services";
import {
  clearOAuthCallbackOnError,
  getOAuthCallbackInFlight,
  trackOAuthCallback,
} from "@/utils/auth/oauthCallbackState";
import {
  clearOAuthRedirectContext,
  isLocalApiBaseUrl,
  isLocalBrowserOrigin,
  readOAuthRedirectContext,
} from "@/utils/auth/oauthRedirectStorage";
import { navigateToErrorPage } from "@/utils/navigation/errorNavigation";

function readAccessTokenFromUrl(): string | null {
  const query = new URLSearchParams(window.location.search);
  const fromQuery = query.get("token");
  if (fromQuery) return fromQuery;

  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;

  const hashParams = new URLSearchParams(hash);
  return hashParams.get("access_token");
}

function navigateHome(): void {
  window.history.replaceState(null, "", "/");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const SUPABASE_LOCAL_REDIRECT_HELP =
  "Add these in Supabase → Authentication → URL configuration → Redirect URLs: " +
  "http://localhost:5000/api/auth/google/callback** and http://localhost:3000/** — " +
  "then sign in from http://localhost:3000 (not the live site).";

export function AuthCallbackPage() {
  const { establishSessionAfterOAuth } = useAuth();
  const establishRef = useRef(establishSessionAfterOAuth);
  establishRef.current = establishSessionAfterOAuth;

  useEffect(() => {
    async function finishSignIn(token: string): Promise<void> {
      const session = await authService.completeGoogleOAuthCallback(token);
      clearOAuthRedirectContext();
      establishRef.current(session);
      navigateHome();
    }

    async function run(): Promise<void> {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");
      const code = params.get("code");
      const stored = readOAuthRedirectContext();

      if (oauthError) {
        clearOAuthRedirectContext();
        navigateToErrorPage({ code: "401", message: oauthError });
        return;
      }

      if (code && !params.get("token")) {
        const apiBase = stored.apiBaseUrl ?? apiConfig.baseUrl;
        const frontendOrigin = stored.frontendOrigin ?? window.location.origin;

        if (isLocalApiBaseUrl(apiBase) && !isLocalBrowserOrigin()) {
          clearOAuthRedirectContext();
          navigateToErrorPage({
            code: "401",
            message: `Google sign-in started on your machine but Supabase sent you to the live app. ${SUPABASE_LOCAL_REDIRECT_HELP}`,
          });
          return;
        }

        const backendCallback = new URL(
          `${apiBase}${API_ENDPOINTS.auth.googleCallback}`,
        );
        backendCallback.searchParams.set("code", code);
        backendCallback.searchParams.set("frontend", frontendOrigin);
        window.location.replace(backendCallback.toString());
        return;
      }

      const token = readAccessTokenFromUrl();
      if (!token) {
        clearOAuthRedirectContext();
        navigateToErrorPage({
          code: "401",
          message: "Sign-in could not be completed. Please try again.",
        });
        return;
      }

      const inFlight = getOAuthCallbackInFlight(token);
      if (inFlight) {
        await inFlight;
        return;
      }

      const promise = finishSignIn(token).catch((err) => {
        clearOAuthCallbackOnError();
        clearOAuthRedirectContext();
        const message =
          err instanceof Error ? err.message : "Sign in failed. Try again.";
        navigateToErrorPage({ code: "500", message });
      });

      trackOAuthCallback(token, promise);
      await promise;
    }

    void run();
  }, []);

  return <AppLoader />;
}
