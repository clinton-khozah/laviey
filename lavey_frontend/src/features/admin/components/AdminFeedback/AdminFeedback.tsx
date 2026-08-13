import { useEffect } from 'react';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { APP_IMAGES } from '@/constants/images';
import './AdminFeedback.css';

export type AdminFeedbackTone = 'success' | 'error' | 'warning' | 'info';

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div className="admin-feedback__backdrop" role="presentation" onMouseDown={() => !busy && onCancel()}>
      <section
        className={`admin-feedback__dialog is-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-feedback__brand"><img src={APP_IMAGES.logo} alt="" /><span>Lavey admin</span></div>
        <div className="admin-feedback__icon" aria-hidden>
          {tone === 'danger' ? (
            <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="M12 17h.01M9.1 9a3 3 0 1 1 4.2 2.75c-.8.4-1.3 1-1.3 2.25" /></svg>
          )}
        </div>
        <h2 id="admin-confirm-title">{title}</h2>
        <p id="admin-confirm-message">{message}</p>
        <div className="admin-feedback__actions">
          <button type="button" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={tone === 'danger' ? 'is-danger' : 'is-primary'} onClick={onConfirm} disabled={busy}>
            {busy ? <><LogoLoader size="sm" label="Processing" /> Processing…</> : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

interface AdminNotificationModalProps {
  open: boolean;
  title?: string;
  message: string;
  tone?: AdminFeedbackTone;
  closeLabel?: string;
  autoCloseMs?: number;
  onClose: () => void;
}

export function AdminNotificationModal({
  open,
  title,
  message,
  tone = 'success',
  closeLabel = 'Done',
  autoCloseMs,
  onClose,
}: AdminNotificationModalProps) {
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const timer = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [autoCloseMs, onClose, open]);

  if (!open) return null;

  const defaultTitle = tone === 'success' ? 'Completed' : tone === 'error' ? 'Something went wrong' : 'Notification';
  return (
    <div className="admin-feedback__backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`admin-feedback__dialog admin-feedback__dialog--notice is-${tone}`} role="status" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="admin-feedback__brand"><img src={APP_IMAGES.logo} alt="" /><span>Lavey admin</span></div>
        <div className="admin-feedback__icon" aria-hidden>
          {tone === 'success' ? (
            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
          ) : tone === 'error' ? (
            <svg viewBox="0 0 24 24"><path d="M12 8v5m0 3h.01M12 3 2.5 20h19L12 3Z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="M12 11v6m0-9h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" /></svg>
          )}
        </div>
        <h2>{title || defaultTitle}</h2>
        <p>{message}</p>
        <div className="admin-feedback__actions"><button type="button" className="is-primary" onClick={onClose}>{closeLabel}</button></div>
      </section>
    </div>
  );
}

interface AdminHeartLoaderProps {
  label?: string;
  overlay?: boolean;
}

export function AdminHeartLoader({ label = 'Loading', overlay = false }: AdminHeartLoaderProps) {
  return (
    <div className={`admin-heart-loader${overlay ? ' is-overlay' : ''}`} role="status" aria-live="polite">
      <LogoLoader size="lg" label={label} />
      <span>{label}</span>
    </div>
  );
}
