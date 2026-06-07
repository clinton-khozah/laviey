const KEY = 'lavey_privacy_settings';

export interface PrivacySettings {
  showInDiscover: boolean;
  hideFromPeople: boolean;
  readReceipts: boolean;
  contactsCanFindMe: boolean;
}

const DEFAULTS: PrivacySettings = {
  showInDiscover: true,
  hideFromPeople: false,
  readReceipts: true,
  contactsCanFindMe: false,
};

export function loadPrivacySettings(): PrivacySettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PrivacySettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrivacySettings(settings: PrivacySettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function updatePrivacySettings(patch: Partial<PrivacySettings>): PrivacySettings {
  const next = { ...loadPrivacySettings(), ...patch };
  savePrivacySettings(next);
  return next;
}
