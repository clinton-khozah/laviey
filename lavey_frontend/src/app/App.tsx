import { AppLoader } from "@/components/ui/AppLoader";
import { PrivacyGuard } from "@/components/privacy/PrivacyGuard";
import { MainApp } from "@/app/MainApp";
import {
  AuthPage,
  AuthCallbackPage,
  OnboardingQuizPage,
} from "@/features/auth";
import { ErrorPage } from "@/features/errors";
import { SubscriptionResultPage } from "@/features/subscription";
import { AdminDashboardPage, AdminLoginPage } from "@/features/admin";
import { adminAuthService } from "@/services/admin/adminAuthService";
import { useAuth } from "@/hooks";
import {
  parseErrorPagePath,
  parseErrorPageSearch,
} from "@/utils/navigation/errorNavigation";
import {
  isMeetupJoinPath,
  parseMeetupJoinCode,
  storePendingMeetupCode,
} from "@/utils/meeting/meetupJoinLink";
import { hasOAuthReturnParams } from "@/utils/auth/oauthCallbackState";
import { applyThemeToDocument, loadTheme } from "@/utils/theme/themeStorage";
import { useEffect, useState } from "react";

const ADMIN_ROOT_PATH = "/admin/19990808";
const ADMIN_LOGIN_PATH = "/admin/19990808/adminlogin";

function App() {
  const {
    isAuthenticated,
    isLoading,
    needsOnboardingQuiz,
    completeOnboardingQuiz,
  } = useAuth();
  const [path, setPath] = useState(() => window.location.pathname);

  const isAdminRoute = path.startsWith(ADMIN_ROOT_PATH);
  const isAdminLoginRoute = path === ADMIN_LOGIN_PATH;
  const [adminSignedIn, setAdminSignedIn] = useState(false);
  const [adminAuthLoading, setAdminAuthLoading] = useState(() =>
    window.location.pathname.startsWith(ADMIN_ROOT_PATH),
  );
  const errorPageCode = parseErrorPagePath(path);
  const errorPageQuery = parseErrorPageSearch(window.location.search);

  const navigateTo = (nextPath: string) => {
    if (window.location.pathname === nextPath) return;
    window.history.pushState(null, "", nextPath);
    setPath(nextPath);
  };

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isMeetupJoinPath(path)) return;
    const code = parseMeetupJoinCode(window.location.search);
    if (code) storePendingMeetupCode(code);
    navigateTo("/");
  }, [path]);

  useEffect(() => {
    if (!isAdminRoute) {
      setAdminAuthLoading(false);
      return;
    }

    let cancelled = false;
    setAdminAuthLoading(true);

    void (async () => {
      const session = await adminAuthService.restoreSession();
      if (cancelled) return;
      setAdminSignedIn(Boolean(session));
      setAdminAuthLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdminRoute]);

  useEffect(() => {
    if (adminSignedIn && isAdminLoginRoute && !adminAuthLoading) {
      navigateTo(ADMIN_ROOT_PATH);
    }
  }, [adminSignedIn, isAdminLoginRoute, adminAuthLoading]);

  useEffect(() => {
    if (!isAdminRoute) return;
    applyThemeToDocument("light");
    return () => {
      applyThemeToDocument(loadTheme());
    };
  }, [isAdminRoute]);

  let content = <MainApp />;

  if (errorPageCode) {
    content = (
      <ErrorPage
        code={errorPageCode}
        message={errorPageQuery.message}
        apiCode={errorPageQuery.apiCode}
        status={errorPageQuery.status}
        onNavigate={navigateTo}
      />
    );
  } else if (path === "/subscription/success") {
    content = <SubscriptionResultPage variant="success" onNavigate={navigateTo} />;
  } else if (path === "/subscription/cancel") {
    content = <SubscriptionResultPage variant="cancel" onNavigate={navigateTo} />;
  } else if (path === "/auth/callback" || hasOAuthReturnParams()) {
    content = <AuthCallbackPage />;
  } else if (isAdminRoute) {
    if (adminAuthLoading) {
      content = <AppLoader />;
    } else if (!adminSignedIn) {
      content = (
        <AdminLoginPage
          onLoginSuccess={() => {
            setAdminSignedIn(true);
            navigateTo(ADMIN_ROOT_PATH);
          }}
        />
      );
    } else {
      content = (
        <AdminDashboardPage
          adminPath={path}
          onNavigate={navigateTo}
          onLogout={() => {
            adminAuthService.signOut();
            setAdminSignedIn(false);
            navigateTo(ADMIN_LOGIN_PATH);
          }}
        />
      );
    }
  } else if (isLoading) {
    content = <AppLoader />;
  } else if (!isAuthenticated) {
    content = <AuthPage />;
  } else if (needsOnboardingQuiz) {
    content = <OnboardingQuizPage onContinue={completeOnboardingQuiz} />;
  }

  return isAdminRoute ? content : <PrivacyGuard>{content}</PrivacyGuard>;
}

export default App;
