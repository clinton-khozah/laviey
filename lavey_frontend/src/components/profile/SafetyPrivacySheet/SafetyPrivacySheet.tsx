import { useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { SheetSaveSuccess, type SheetSaveAction } from '@/components/profile/SheetSaveSuccess';
import { privacyService, type PrivacySettingsResponse } from '@/services/privacy/privacyService';
import type { PrivacySettings } from '@/utils/privacy/privacySettingsStorage';
import './SafetyPrivacySheet.css';

interface SafetyPrivacySheetProps {
  open: boolean;
  onClose: () => void;
  onRequestDeleteAccount: () => void;
  onOpenBlockedUsers: () => void;
}

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
    <div className="safety-sheet__toggle-row">
      <div className="safety-sheet__toggle-text">
        <span>{label}</span>
        {hint && <span className="safety-sheet__toggle-hint">{hint}</span>}
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

type ContactPickerContact = { name?: string[]; tel?: string[] };

interface ContactsManager {
  select: (
    properties: string[],
    options?: { multiple?: boolean },
  ) => Promise<ContactPickerContact[]>;
}

declare global {
  interface Navigator {
    contacts?: ContactsManager;
  }
}

const EMPTY_SETTINGS: PrivacySettingsResponse = {
  showInDiscover: true,
  hideFromPeople: false,
  readReceipts: true,
  contactsCanFindMe: false,
  hasPhoneLinked: false,
};

export function SafetyPrivacySheet({
  open,
  onClose,
  onRequestDeleteAccount,
  onOpenBlockedUsers,
}: SafetyPrivacySheetProps) {
  const [settings, setSettings] = useState<PrivacySettingsResponse>(EMPTY_SETTINGS);
  const [phoneInput, setPhoneInput] = useState('');
  const [showPhoneField, setShowPhoneField] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState<{
    action: SheetSaveAction;
    detail?: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    setSaveFlash(null);
    setImportStatus(null);
    setActionError(null);
    setShowPhoneField(false);
    setPhoneInput('');

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      try {
        const data = await privacyService.getSettings();
        if (!cancelled) setSettings(data);
      } catch (err) {
        if (!cancelled) {
          setActionError(err instanceof Error ? err.message : 'Could not load privacy settings.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const flashSave = (action: SheetSaveAction = 'safety', detail?: string) => {
    setSaveFlash({ action, detail });
  };

  const patchSettings = async (patch: Partial<PrivacySettings> & { phone?: string }) => {
    setIsSaving(true);
    setActionError(null);
    try {
      const next = await privacyService.updateSettings(patch);
      setSettings(next);
      flashSave('safety');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save privacy settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHideFromPeople = () => {
    void patchSettings({ hideFromPeople: !settings.hideFromPeople });
  };

  const handleContactsToggle = () => {
    const next = !settings.contactsCanFindMe;
    if (next && !settings.hasPhoneLinked && !phoneInput.trim()) {
      setShowPhoneField(true);
      return;
    }
    void patchSettings({
      contactsCanFindMe: next,
      ...(phoneInput.trim() ? { phone: phoneInput.trim() } : {}),
    });
  };

  const handleLinkPhone = () => {
    if (!phoneInput.trim()) {
      setActionError('Enter your phone number with country code (e.g. +27821234567).');
      return;
    }
    void patchSettings({
      contactsCanFindMe: true,
      phone: phoneInput.trim(),
    }).then(() => setShowPhoneField(false));
  };

  const handleImportContacts = async () => {
    setImportStatus(null);
    setActionError(null);
    setIsImporting(true);

    try {
      if (!navigator.contacts?.select) {
        setImportStatus(
          'Contact import works best in the Lavey app on your phone. Enable “Let contacts find me” so friends can discover you.',
        );
        return;
      }

      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      const phones = picked.flatMap((contact) => contact.tel ?? []).filter(Boolean);
      if (phones.length === 0) {
        setImportStatus('No contacts with phone numbers selected.');
        return;
      }

      const result = await privacyService.importContacts(phones);
      const matchCount = result.matches.length;
      if (matchCount > 0) {
        const names = result.matches.map((m) => m.displayName).join(', ');
        flashSave(
          'contacts-import',
          `Found ${matchCount} friend${matchCount === 1 ? '' : 's'} on Lavey: ${names}`,
        );
      } else {
        flashSave(
          'contacts-import',
          `Imported ${result.imported} contact${result.imported === 1 ? '' : 's'} — we’ll notify you when they join Lavey.`,
        );
      }
    } catch {
      setImportStatus('Couldn’t access contacts. Check permissions and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadData = async () => {
    setIsDownloading(true);
    setActionError(null);
    try {
      const data = await privacyService.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lavey-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      flashSave('safety', 'Your data export has been downloaded.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not download your data.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ProfileSheet open={open} title="Safety & privacy" onClose={onClose} fromTop hideHandle>
      <div className="safety-sheet">
        {saveFlash && (
          <SheetSaveSuccess
            variant="overlay"
            action={saveFlash.action}
            detail={saveFlash.detail}
            onComplete={() => setSaveFlash(null)}
            autoCloseMs={2200}
          />
        )}
        {isLoading && <p className="safety-sheet__status">Loading your settings…</p>}
        {actionError && (
          <p className="safety-sheet__error" role="alert">
            {actionError}
          </p>
        )}
        <section className="safety-sheet__section" aria-label="Visibility">
          <h3 className="safety-sheet__section-title">Visibility</h3>
          <ToggleRow
            label="Hide my account from people"
            hint="Your profile won’t show to others until you turn this off"
            pressed={settings.hideFromPeople}
            disabled={isSaving || isLoading}
            onToggle={handleHideFromPeople}
          />
        </section>

        <section className="safety-sheet__section" aria-label="Contacts">
          <h3 className="safety-sheet__section-title">Contacts</h3>
          <ToggleRow
            label="Let contacts find me"
            hint="People with your phone number or email can find you on Lavey"
            pressed={settings.contactsCanFindMe}
            disabled={isSaving || isLoading}
            onToggle={handleContactsToggle}
          />
          {(showPhoneField || (settings.contactsCanFindMe && !settings.hasPhoneLinked)) && (
            <div className="safety-sheet__phone-field">
              <label className="safety-sheet__phone-label" htmlFor="safety-phone">
                Your phone number
              </label>
              <input
                id="safety-phone"
                type="tel"
                className="safety-sheet__phone-input"
                placeholder="+27821234567"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                autoComplete="tel"
              />
              <button
                type="button"
                className="profile-sheet__btn profile-sheet__btn--secondary"
                disabled={isSaving}
                onClick={handleLinkPhone}
              >
                Link phone & enable
              </button>
            </div>
          )}
          <button
            type="button"
            className="safety-sheet__action-row"
            disabled={isImporting || isLoading}
            onClick={() => void handleImportContacts()}
          >
            <span className="safety-sheet__action-text">
              <span className="safety-sheet__action-label">Import from contacts</span>
              <span className="safety-sheet__action-hint">Find friends who are already on Lavey</span>
            </span>
            <span className="safety-sheet__action-icon" aria-hidden>
              {isImporting ? '…' : '→'}
            </span>
          </button>
          {importStatus && (
            <p className="safety-sheet__status" role="status">
              {importStatus}
            </p>
          )}
        </section>

        <section className="safety-sheet__section" aria-label="Messaging">
          <h3 className="safety-sheet__section-title">Messaging</h3>
          <ToggleRow
            label="Read receipts"
            hint="Let matches see when you’ve read their messages"
            pressed={settings.readReceipts}
            disabled={isSaving || isLoading}
            onToggle={() => void patchSettings({ readReceipts: !settings.readReceipts })}
          />
        </section>

        <section className="safety-sheet__section" aria-label="Your data">
          <h3 className="safety-sheet__section-title">Your data</h3>
          <button
            type="button"
            className="profile-sheet__btn profile-sheet__btn--secondary"
            onClick={onOpenBlockedUsers}
          >
            Blocked users
          </button>
          <button
            type="button"
            className="profile-sheet__btn profile-sheet__btn--secondary"
            disabled={isDownloading}
            onClick={() => void handleDownloadData()}
          >
            {isDownloading ? 'Preparing download…' : 'Download my data'}
          </button>
        </section>

        <section className="safety-sheet__section safety-sheet__section--danger" aria-label="Account">
          <button
            type="button"
            className="profile-sheet__btn profile-sheet__btn--danger"
            onClick={onRequestDeleteAccount}
          >
            Delete my account permanently
          </button>
          <p className="safety-sheet__danger-hint">
            This removes your profile, matches, and messages. This cannot be undone.
          </p>
        </section>
      </div>
    </ProfileSheet>
  );
}
