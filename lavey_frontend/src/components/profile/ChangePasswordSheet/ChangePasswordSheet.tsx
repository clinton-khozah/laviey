import { useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { settingsService } from '@/services/settings/settingsService';
import './ChangePasswordSheet.css';

interface ChangePasswordSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangePasswordSheet({ open, onClose, onSuccess }: ChangePasswordSheetProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await settingsService.changePassword(currentPassword, newPassword);
      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProfileSheet open={open} title="Change password" onClose={handleClose} fromTop hideHandle>
      <div className="change-password-sheet profile-sheet__settings">
        <p className="change-password-sheet__lead">
          Enter your current password, then choose a new one.
        </p>
        {error && (
          <p className="change-password-sheet__error" role="alert">
            {error}
          </p>
        )}
        <label className="profile-sheet__field">
          <span className="profile-sheet__label">Current password</span>
          <input
            type="password"
            className="profile-sheet__input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="profile-sheet__field">
          <span className="profile-sheet__label">New password</span>
          <input
            type="password"
            className="profile-sheet__input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="profile-sheet__field">
          <span className="profile-sheet__label">Confirm new password</span>
          <input
            type="password"
            className="profile-sheet__input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button
          type="button"
          className="profile-sheet__btn"
          disabled={isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
        <button
          type="button"
          className="profile-sheet__btn profile-sheet__btn--secondary"
          onClick={handleClose}
        >
          Cancel
        </button>
      </div>
    </ProfileSheet>
  );
}
