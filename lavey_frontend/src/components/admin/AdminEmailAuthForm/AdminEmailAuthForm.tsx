import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type FormEvent } from 'react';
import type { AdminEmailAuthFormProps } from './AdminEmailAuthForm.types';
import '@/components/auth/EmailAuthForm/EmailAuthForm.css';

export function AdminEmailAuthForm({
  mode,
  onModeChange,
  onSignIn,
  onSignUp,
  disabled,
  showInviteCode = true,
  requiresInviteCode = false,
  initialEmail = '',
}: AdminEmailAuthFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'sign-in') {
      onSignIn(email.trim(), password);
    } else {
      onSignUp(email.trim(), password, displayName.trim(), inviteCode.trim());
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
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
                disabled={disabled}
              />
            </label>
            {showInviteCode && (requiresInviteCode || inviteCode.length > 0) && (
              <label className="email-auth__field">
                <span className="email-auth__label">Invite code</span>
                <input
                  type="text"
                  className="email-auth__input"
                  placeholder={requiresInviteCode ? 'Required — ask your team lead' : 'Only if adding another admin'}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required={requiresInviteCode}
                  autoComplete="off"
                  disabled={disabled}
                />
              </label>
            )}
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
            minLength={mode === 'sign-up' ? 8 : 1}
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
        {mode === 'sign-in' ? 'Sign in' : 'Create admin account'}
      </button>

      <p className="email-auth__toggle">
        {mode === 'sign-in' ? (
          <>
            Need an account?{' '}
            <button
              type="button"
              className="email-auth__link"
              onClick={() => onModeChange('sign-up')}
              disabled={disabled}
            >
              Register
            </button>
          </>
        ) : (
          <>
            Already registered?{' '}
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
