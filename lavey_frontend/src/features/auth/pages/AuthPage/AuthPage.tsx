import { useState } from 'react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { EmailAuthForm } from '@/components/auth/EmailAuthForm';
import { EmailVerificationForm } from '@/components/auth/EmailVerificationForm';
import type { EmailAuthMode } from '@/components/auth/EmailAuthForm';
import { APP_IMAGES } from '@/constants/images';
import { useAuth } from '@/hooks';
import { getGoogleSignInBlockedMessage } from '@/utils/google/googleEnvironment';
import './AuthPage.css';

export function AuthPage() {
  const {
    error,
    isSubmitting,
    pendingVerificationEmail,
    verificationStatus,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    verifyEmailWithCode,
    resendVerificationEmail,
    resendVerificationForEmail,
    resendCooldownSec,
    clearPendingVerification,
    clearError,
  } = useAuth();
  const [emailMode, setEmailMode] = useState<EmailAuthMode>('sign-in');
  const webViewWarning = getGoogleSignInBlockedMessage();
  const showVerification = Boolean(pendingVerificationEmail);

  const handleModeChange = (mode: EmailAuthMode) => {
    clearError();
    clearPendingVerification();
    setEmailMode(mode);
  };

  return (
    <div className="auth-page">
      <div className="auth-page__hero" aria-hidden>
        <img src={APP_IMAGES.logo} alt="" className="auth-page__hero-img" />
        <div className="auth-page__hero-scrim" />
      </div>

      <div className="auth-page__shell">
        <header className="auth-page__header">
          <img
            src={APP_IMAGES.logoWithText}
            alt="Lavey"
            className="auth-page__brand-img"
          />
          <p className="auth-page__tagline">Feel the vibe before you match</p>
        </header>

        <div className="auth-page__card">
          {webViewWarning && (
            <p className="auth-page__hint" role="status">
              {webViewWarning}{' '}
              <a href={window.location.href} target="_blank" rel="noreferrer">
                Open in browser
              </a>
            </p>
          )}

          {!showVerification && (
            <>
              <GoogleSignInButton
                onClick={() => void signInWithGoogle()}
                disabled={isSubmitting}
              />

              <div className="auth-page__divider" role="separator">
                <span>or</span>
              </div>

              <EmailAuthForm
                mode={emailMode}
                onModeChange={handleModeChange}
                onSignIn={(email, password) => void signInWithEmail({ email, password })}
                onSignUp={(email, password, displayName) =>
                  void signUpWithEmail({ email, password, displayName })
                }
                onResendVerification={(email) => void resendVerificationForEmail(email)}
                resendCooldownSec={resendCooldownSec}
                disabled={isSubmitting}
              />
            </>
          )}

          {showVerification && pendingVerificationEmail && (
            <EmailVerificationForm
              email={pendingVerificationEmail}
              onVerify={(code) => void verifyEmailWithCode(code)}
              onResend={() => void resendVerificationEmail()}
              onBack={() => {
                clearPendingVerification();
                setEmailMode('sign-in');
              }}
              disabled={isSubmitting}
              resendCooldownSec={resendCooldownSec}
              statusMessage={verificationStatus}
            />
          )}

          {error && (
            <p className="auth-page__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <p className="auth-page__legal">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
