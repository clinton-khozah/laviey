import { useEffect, useRef, useState, type FormEvent } from 'react';
import './EmailVerificationForm.css';

export interface EmailVerificationFormProps {
  email: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  disabled?: boolean;
  resendCooldownSec?: number;
  statusMessage?: string | null;
  errorMessage?: string | null;
}

const CODE_LENGTH = 8;

export function EmailVerificationForm({
  email,
  onVerify,
  onResend,
  onBack,
  disabled,
  resendCooldownSec = 0,
  statusMessage,
  errorMessage,
}: EmailVerificationFormProps) {
  const [code, setCode] = useState('');
  const [boxError, setBoxError] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // A wrong/expired code should clear the field and put focus back on it so
  // re-entering a fresh code doesn't require manually deleting the old one.
  useEffect(() => {
    if (!errorMessage) return;
    setBoxError(true);
    setCode('');
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [errorMessage]);

  const handleChange = (rawValue: string) => {
    setBoxError(false);
    setCode(rawValue.replace(/\D/g, '').slice(0, CODE_LENGTH));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onVerify(code.trim());
  };

  const resendLabel =
    resendCooldownSec > 0
      ? `Resend verification code (${resendCooldownSec}s)`
      : 'Resend verification code';

  return (
    <form className="email-verify" onSubmit={handleSubmit}>
      <div className="email-verify__intro">
        <p className="email-verify__title">Verify your email</p>
        <p className="email-verify__copy">
          We sent an {CODE_LENGTH}-digit code to <strong>{email}</strong>. Enter it below to continue.
        </p>
      </div>

      <div className="email-verify__field">
        <span className="email-verify__label">Verification code</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LENGTH}
          className={`email-verify__input${boxError ? ' email-verify__input--error' : ''}`}
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder={'•'.repeat(CODE_LENGTH)}
          required
          disabled={disabled}
          autoFocus
          aria-label="Verification code"
        />
      </div>

      {boxError && errorMessage && (
        <p className="email-verify__error" role="alert">
          {errorMessage}
        </p>
      )}

      {!(boxError && errorMessage) && statusMessage && (
        <p className="email-verify__status" role="status">
          {statusMessage}
        </p>
      )}

      <button
        type="submit"
        className="email-verify__submit"
        disabled={disabled || code.length < CODE_LENGTH}
      >
        Verify &amp; continue
      </button>

      <button
        type="button"
        className="email-verify__resend"
        onClick={onResend}
        disabled={disabled || resendCooldownSec > 0}
      >
        {resendLabel}
      </button>

      <p className="email-verify__actions">
        <button type="button" className="email-verify__link" onClick={onBack} disabled={disabled}>
          Back to sign in
        </button>
      </p>
    </form>
  );
}
