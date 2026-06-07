import { useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { AppLanguagePicker } from '@/components/profile/AppLanguagePicker';
import { ChangePasswordSheet } from '@/components/profile/ChangePasswordSheet';
import { ChatTypingStylePicker } from '@/components/profile/ChatTypingStylePicker';
import { SheetSaveSuccess } from '@/components/profile/SheetSaveSuccess';
import { ThemeModePicker } from '@/components/profile/ThemeModePicker';
import { useAuth, useChatTypingStyle, useMeetingLanguage, useTheme } from '@/hooks';
import { settingsService } from '@/services/settings/settingsService';
import type { MeetingLanguageCode } from '@/constants/meeting/meetingLanguages';
import type { AppTheme, ChatTypingStyle } from '@/types';
import { applyUserSettings, getLocalUserSettings } from '@/utils/settings/applyUserSettings';
import { markThemeExplicitlyChosen } from '@/utils/theme/themeStorage';
import './SettingsSheet.css';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenSupport: () => void;
}

interface SettingsDraft {
  theme: AppTheme;
  chatTypingStyle: ChatTypingStyle;
  language: MeetingLanguageCode;
  pushNotificationsEnabled: boolean;
  email: string;
  canChangePassword: boolean;
}

type SavePhase = 'idle' | 'loading' | 'saving' | 'success';

function ToggleRow({
  label,
  hint,
  pressed,
  disabled,
  onToggle,
}: {
  label: string;
  hint?: string;
  pressed: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="settings-sheet__toggle-row">
      <div className="settings-sheet__toggle-text">
        <span>{label}</span>
        {hint && <span className="settings-sheet__toggle-hint">{hint}</span>}
      </div>
      <button
        type="button"
        className={`profile-sheet__toggle ${pressed ? 'profile-sheet__toggle--on' : ''}`}
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={pressed}
        aria-label={label}
      />
    </div>
  );
}

export function SettingsSheet({ open, onClose, onOpenSupport }: SettingsSheetProps) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { chatTypingStyle, setChatTypingStyle } = useChatTypingStyle();
  const { language, setLanguage } = useMeetingLanguage();

  const [draft, setDraft] = useState<SettingsDraft>(() => {
    const local = getLocalUserSettings();
    return {
      ...local,
      email: user?.email ?? '',
      canChangePassword: user?.provider === 'email',
    };
  });
  const [savePhase, setSavePhase] = useState<SavePhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setSavePhase('loading');
    setError(null);
    setPasswordSuccess(null);
    setChangePasswordOpen(false);

    let cancelled = false;
    void (async () => {
      try {
        const data = await settingsService.getSettings();
        if (!cancelled) {
          setDraft({
            theme: data.theme,
            chatTypingStyle: data.chatTypingStyle,
            language: data.language,
            pushNotificationsEnabled: data.pushNotificationsEnabled,
            email: data.email,
            canChangePassword: data.canChangePassword,
          });
          setSavePhase('idle');
        }
      } catch (err) {
        if (!cancelled) {
          const local = getLocalUserSettings();
          setDraft({
            ...local,
            email: user?.email ?? '',
            canChangePassword: user?.provider === 'email',
          });
          setError(getUserFacingErrorMessage(err, 'Could not load settings.'));
          setSavePhase('idle');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, user?.email, user?.provider]);

  const patchDraft = (patch: Partial<SettingsDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    setSavePhase('saving');
    setError(null);
    try {
      const saved = await settingsService.updateSettings({
        theme: draft.theme,
        chatTypingStyle: draft.chatTypingStyle,
        language: draft.language,
        pushNotificationsEnabled: draft.pushNotificationsEnabled,
      });

      markThemeExplicitlyChosen();

      applyUserSettings(
        {
          theme: saved.theme,
          chatTypingStyle: saved.chatTypingStyle,
          language: saved.language,
          pushNotificationsEnabled: saved.pushNotificationsEnabled,
        },
        { setTheme, setChatTypingStyle, setLanguage },
      );

      setDraft({
        theme: saved.theme,
        chatTypingStyle: saved.chatTypingStyle,
        language: saved.language,
        pushNotificationsEnabled: saved.pushNotificationsEnabled,
        email: saved.email,
        canChangePassword: saved.canChangePassword,
      });
      setSavePhase('success');
    } catch (err) {
      setError(getUserFacingErrorMessage(err, 'Could not save settings.'));
      setSavePhase('idle');
    }
  };

  const isBusy = savePhase === 'loading' || savePhase === 'saving';

  return (
    <>
      <ProfileSheet open={open} title="Settings" onClose={onClose} fromTop hideHandle>
        {savePhase === 'success' ? (
          <SheetSaveSuccess action="settings" onComplete={onClose} />
        ) : (
          <div className="settings-sheet profile-sheet__settings">
            {savePhase === 'loading' && (
              <p className="settings-sheet__status">Loading your preferences…</p>
            )}
            {error && (
              <p className="settings-sheet__error" role="alert">
                {error}
              </p>
            )}
            {passwordSuccess && (
              <p className="settings-sheet__status" role="status">
                {passwordSuccess}
              </p>
            )}

            <ThemeModePicker
              value={draft.theme}
              onChange={(next) => patchDraft({ theme: next })}
            />
            <ChatTypingStylePicker
              value={draft.chatTypingStyle}
              onChange={(next) => patchDraft({ chatTypingStyle: next })}
            />
            <AppLanguagePicker
              value={draft.language}
              onChange={(next) => patchDraft({ language: next })}
            />

            <section className="settings-sheet__section" aria-label="Notifications">
              <h3 className="settings-sheet__section-title">Notifications</h3>
              <ToggleRow
                label="Push notifications"
                hint="Alerts for new matches, messages, and gift activity"
                pressed={draft.pushNotificationsEnabled}
                disabled={isBusy}
                onToggle={() =>
                  patchDraft({ pushNotificationsEnabled: !draft.pushNotificationsEnabled })
                }
              />
            </section>

            <section className="settings-sheet__section" aria-label="Account">
              <h3 className="settings-sheet__section-title">Account</h3>
              <label className="profile-sheet__field settings-sheet__field">
                <span className="profile-sheet__label">Email</span>
                <input className="profile-sheet__input" value={draft.email} readOnly />
              </label>
              {draft.canChangePassword ? (
                <button
                  type="button"
                  className="profile-sheet__btn profile-sheet__btn--secondary"
                  disabled={isBusy}
                  onClick={() => setChangePasswordOpen(true)}
                >
                  Change password
                </button>
              ) : (
                <p className="settings-sheet__oauth-hint">
                  You signed in with Google — manage your password in your Google account.
                </p>
              )}
              <button
                type="button"
                className="profile-sheet__btn profile-sheet__btn--secondary settings-sheet__support-btn"
                disabled={isBusy}
                onClick={onOpenSupport}
              >
                Support — talk to us
              </button>
            </section>

            <button
              type="button"
              className="profile-sheet__btn settings-sheet__save"
              disabled={isBusy}
              onClick={() => void handleSave()}
            >
              {savePhase === 'saving' ? 'Saving…' : 'Save preferences'}
            </button>
          </div>
        )}
      </ProfileSheet>

      <ChangePasswordSheet
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onSuccess={() => {
          setChangePasswordOpen(false);
          setPasswordSuccess('Password updated successfully.');
        }}
      />
    </>
  );
}
