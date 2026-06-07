import { AnimatePresence, motion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import type { EmailAuthFormProps } from './EmailAuthForm.types';
import './EmailAuthForm.css';

export function EmailAuthForm({
  mode,
  onModeChange,
  onSignIn,
  onSignUp,
  onResendVerification,
  resendCooldownSec = 0,
  disabled,
}: EmailAuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'sign-in') {
      onSignIn(email.trim(), password);
    } else {
      onSignUp(email.trim(), password, displayName.trim());
    }
  };

  return (
    <form className="email-auth" onSubmit={handleSubmit}>
      <AnimatePresence initial={false}>
        {mode === 'sign-up' && (
          <motion.div
            className="email-auth__anim"
            initial={{ height: 0, opacity: 0, y: -6 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <label className="email-auth__field">
              <span className="email-auth__label">Name</span>
              <input
                type="text"
                className="email-auth__input"
                placeholder="How should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
                disabled={disabled}
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      <label className="email-auth__field">
        <span className="email-auth__label">Email</span>
        <input
          type="email"
          className="email-auth__input"
          placeholder=""
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={disabled}
        />
      </label>

      <label className="email-auth__field">
        <span className="email-auth__label">Password</span>
        <div className="email-auth__input-wrap">
          <input
            type={showPassword ? 'text' : 'password'}
            className="email-auth__input email-auth__input--with-icon"
            placeholder=""
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            disabled={disabled}
          />
          <button
            type="button"
            className="email-auth__icon-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            disabled={disabled}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.84 21.84 0 015.06-6.88" />
                <path d="M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a21.86 21.86 0 01-3.17 4.55" />
                <path d="M14.12 14.12a3 3 0 01-4.24-4.24" />
                <path d="M1 1l22 22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </label>

      <button type="submit" className="email-auth__submit" disabled={disabled}>
        {mode === 'sign-in' ? 'Sign in with email' : 'Create account'}
      </button>

      {mode === 'sign-in' && onResendVerification && (
        <button
          type="button"
          className="email-auth__resend"
          disabled={disabled || !email.trim() || resendCooldownSec > 0}
          onClick={() => onResendVerification(email.trim())}
        >
          {resendCooldownSec > 0
            ? `Resend verification code (${resendCooldownSec}s)`
            : 'Resend verification code'}
        </button>
      )}

      <p className="email-auth__toggle">
        {mode === 'sign-in' ? (
          <>
            New here?{' '}
            <button
              type="button"
              className="email-auth__link"
              onClick={() => onModeChange('sign-up')}
              disabled={disabled}
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="email-auth__link"
              onClick={() => onModeChange('sign-in')}
              disabled={disabled}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}
