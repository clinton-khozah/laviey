import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
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
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''));
  const [boxError, setBoxError] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // A wrong/expired code should clear the boxes and put focus back on the first
  // one so re-entering a fresh code doesn't require manually deleting each digit.
  useEffect(() => {
    if (!errorMessage) return;
    setBoxError(true);
    setDigits(Array(CODE_LENGTH).fill(''));
    window.requestAnimationFrame(() => {
      inputRefs.current[0]?.focus();
    });
  }, [errorMessage]);

  const code = digits.join('');

  const focusBox = (index: number) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const handleChange = (index: number, rawValue: string) => {
    setBoxError(false);
    const value = rawValue.replace(/\D/g, '');
    if (!value) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      const chars = value.split('');
      let cursor = index;
      for (const char of chars) {
        if (cursor >= CODE_LENGTH) break;
        next[cursor] = char;
        cursor += 1;
      }
      window.requestAnimationFrame(() => focusBox(Math.min(cursor, CODE_LENGTH - 1)));
      return next;
    });
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
        return;
      }
      if (index > 0) {
        e.preventDefault();
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
        focusBox(index - 1);
      }
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusBox(index - 1);
    }
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    handleChange(index, pasted);
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
        <div className="email-verify__boxes" role="group" aria-label="Verification code">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              pattern="[0-9]*"
              maxLength={CODE_LENGTH}
              className={`email-verify__box${boxError ? ' email-verify__box--error' : ''}`}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              onFocus={(e) => e.target.select()}
              required
              disabled={disabled}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>
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
