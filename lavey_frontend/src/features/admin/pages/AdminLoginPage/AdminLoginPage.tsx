import { useEffect, useState } from 'react';
import { AdminEmailAuthForm } from '@/components/admin/AdminEmailAuthForm';
import type { AdminEmailAuthMode } from '@/components/admin/AdminEmailAuthForm';
import { AppLoader } from '@/components/ui/AppLoader';
import { APP_IMAGES } from '@/constants/images';
import { useAdminAuth } from '@/hooks/admin/useAdminAuth';
import { adminAuthService } from '@/services/admin/adminAuthService';
import './AdminLoginPage.css';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
}

export function AdminLoginPage({ onLoginSuccess }: AdminLoginPageProps) {
  const { isSubmitting, error, clearError, signIn, signUp } = useAdminAuth();
  const [mode, setMode] = useState<AdminEmailAuthMode>('sign-in');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [prefillEmail, setPrefillEmail] = useState('');
  const [requiresInviteCode, setRequiresInviteCode] = useState(false);

  useEffect(() => {
    void adminAuthService.getRegistrationStatus().then((status) => {
      setRequiresInviteCode(status.requiresInviteCode);
    });
  }, []);

  const handleModeChange = (nextMode: AdminEmailAuthMode) => {
    clearError();
    setStatusMessage(null);
    setMode(nextMode);
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      await signIn({ email, password });
      setStatusMessage(null);
      onLoginSuccess();
    } catch {
      /* error surfaced via hook */
    }
  };

  const handleSignUp = async (
    email: string,
    password: string,
    displayName: string,
    inviteCode: string,
  ) => {
    try {
      await signUp({
        email,
        password,
        displayName,
        inviteCode: inviteCode || undefined,
      });
      setPrefillEmail(email);
      setMode('sign-in');
      setStatusMessage(`Account created for ${displayName.trim() || email}. Sign in with your email and password.`);
    } catch {
      /* error surfaced via hook */
    }
  };

  return (
    <main className="admin-login">
      <section className="admin-login__card">
        <img src={APP_IMAGES.logo} alt="Lavey" className="admin-login__logo" />
        <h1 className="admin-login__title">{mode === 'sign-in' ? 'Admin sign in' : 'Admin registration'}</h1>
        <p className="admin-login__subtitle">Secure access to the Lavey command center</p>

        {mode === 'sign-up' && requiresInviteCode && (
          <p className="admin-login__hint" role="note">
            An admin account already exists. Use <strong>Sign in</strong> with that account, or enter your team invite
            code below to add another admin.
          </p>
        )}

        {statusMessage && (
          <p className="admin-login__status" role="status">
            {statusMessage}
          </p>
        )}

        <AdminEmailAuthForm
          mode={mode}
          onModeChange={handleModeChange}
          onSignIn={(email, password) => void handleSignIn(email, password)}
          onSignUp={(email, password, displayName, inviteCode) =>
            void handleSignUp(email, password, displayName, inviteCode)
          }
          disabled={isSubmitting}
          initialEmail={prefillEmail}
          requiresInviteCode={requiresInviteCode}
        />

        {isSubmitting && (
          <div className="admin-login__loading" aria-live="polite">
            <AppLoader />
          </div>
        )}

        {error && (
          <p className="admin-login__error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
