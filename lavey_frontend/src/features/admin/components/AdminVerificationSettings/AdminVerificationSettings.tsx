import { useEffect, useState } from 'react';
import { adminVerificationService } from '@/services/admin/adminVerificationService';
import './AdminVerificationSettings.css';

export function AdminVerificationSettings() {
  const [email, setEmail] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void adminVerificationService
      .getNotificationSettings()
      .then((settings) => {
        if (cancelled) return;
        setEmail(settings.notificationEmail);
        setUpdatedAt(settings.updatedAt);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load verification settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter an email address.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    void adminVerificationService
      .updateNotificationSettings(trimmed)
      .then((settings) => {
        setEmail(settings.notificationEmail);
        setUpdatedAt(settings.updatedAt);
        setNotice('Verification notification email saved.');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not save settings.');
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="admin-verification-settings">
      <p className="admin-verification-settings__lead">
        When a member submits identity verification from the app, an email is sent to this address
        so you can review the request in Verification requests.
      </p>

      {loading ? <p className="admin-verification-settings__muted">Loading…</p> : null}
      {error ? <p className="admin-verification-settings__error">{error}</p> : null}
      {notice ? <p className="admin-verification-settings__notice">{notice}</p> : null}

      {!loading ? (
        <>
          <label className="admin-verification-settings__field">
            <span>Notification email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={saving}
            />
          </label>

          {updatedAt ? (
            <p className="admin-verification-settings__meta">
              Last updated {new Date(updatedAt).toLocaleString()}
            </p>
          ) : null}

          <button type="button" className="admin-verification-settings__save" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save email'}
          </button>
        </>
      ) : null}
    </div>
  );
}
