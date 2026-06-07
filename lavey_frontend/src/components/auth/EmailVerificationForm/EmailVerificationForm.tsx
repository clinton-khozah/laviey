import { useState, type FormEvent } from 'react';
import './EmailVerificationForm.css';

export interface EmailVerificationFormProps {
  email: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  disabled?: boolean;
  resendCooldownSec?: number;
  statusMessage?: string | null;
}

export function EmailVerificationForm({
  email,
  onVerify,
  onResend,
  onBack,
  disabled,
  resendCooldownSec = 0,
  statusMessage,
}: EmailVerificationFormProps) {
  const [code, setCode] = useState('');

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
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to continue.
        </p>
      </div>

      <label className="email-verify__field">
        <span className="email-verify__label">Verification code</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={8}
          className="email-verify__input"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          required
          disabled={disabled}
        />
      </label>

      {statusMessage && (
        <p className="email-verify__status" role="status">
          {statusMessage}
        </p>
      )}

      <button type="submit" className="email-verify__submit" disabled={disabled || code.length < 6}>
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
