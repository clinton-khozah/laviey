import { createSupabaseUserClient } from '../lib/supabase.user.js';
import type { AuthUser } from '../types/api.types.js';
import { AppError } from '../utils/appError.js';
import { ensureProfileRow } from './profile.service.js';

export type AppTheme = 'night' | 'light';
export type ChatTypingStyle = 'romantic' | 'classic' | 'neon' | 'minimal';
export type AppLanguage = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'ko' | 'zh';

interface PreferencesRow {
  app_theme: AppTheme;
  chat_typing_style: ChatTypingStyle;
  app_language: AppLanguage;
  push_notifications_enabled: boolean;
  email: string | null;
}

export interface UserSettingsDto {
  theme: AppTheme;
  chatTypingStyle: ChatTypingStyle;
  language: AppLanguage;
  pushNotificationsEnabled: boolean;
  email: string;
  canChangePassword: boolean;
}

export interface UpdateUserSettingsInput {
  theme?: AppTheme;
  chatTypingStyle?: ChatTypingStyle;
  language?: AppLanguage;
  pushNotificationsEnabled?: boolean;
}

const VALID_THEMES: AppTheme[] = ['night', 'light'];
const VALID_STYLES: ChatTypingStyle[] = ['romantic', 'classic', 'neon', 'minimal'];
const VALID_LANGUAGES: AppLanguage[] = ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'];

function isMissingSettingsSchema(message: string): boolean {
  return /app_theme|chat_typing_style|app_language|push_notifications_enabled/i.test(message);
}

function mapRow(authUser: AuthUser, row: PreferencesRow): UserSettingsDto {
  return {
    theme: row.app_theme,
    chatTypingStyle: row.chat_typing_style,
    language: row.app_language,
    pushNotificationsEnabled: row.push_notifications_enabled,
    email: row.email ?? authUser.email,
    canChangePassword: authUser.provider === 'email',
  };
}

async function loadPreferencesRow(
  authUser: AuthUser,
  accessToken: string,
): Promise<PreferencesRow> {
  await ensureProfileRow(authUser, accessToken);

  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('profiles')
    .select('app_theme, chat_typing_style, app_language, push_notifications_enabled, email')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (error) {
    if (isMissingSettingsSchema(error.message)) {
      throw new AppError(
        500,
        'SETTINGS_SCHEMA_MISSING',
        'Settings columns are missing. Run sql/016_user_preferences.sql in Supabase.',
      );
    }
    throw new AppError(500, 'SETTINGS_READ_FAILED', error.message);
  }

  return (data as PreferencesRow | null) ?? {
    app_theme: 'light',
    chat_typing_style: 'romantic',
    app_language: 'en',
    push_notifications_enabled: true,
    email: authUser.email,
  };
}

export async function getUserSettings(
  authUser: AuthUser,
  accessToken: string,
): Promise<UserSettingsDto> {
  const row = await loadPreferencesRow(authUser, accessToken);
  return mapRow(authUser, row);
}

export async function updateUserSettings(
  authUser: AuthUser,
  accessToken: string,
  input: UpdateUserSettingsInput,
): Promise<UserSettingsDto> {
  const patch: Record<string, unknown> = {};

  if (input.theme !== undefined) {
    if (!VALID_THEMES.includes(input.theme)) {
      throw new AppError(400, 'INVALID_THEME', 'Theme must be night or light');
    }
    patch.app_theme = input.theme;
  }
  if (input.chatTypingStyle !== undefined) {
    if (!VALID_STYLES.includes(input.chatTypingStyle)) {
      throw new AppError(400, 'INVALID_CHAT_STYLE', 'Invalid chat typing style');
    }
    patch.chat_typing_style = input.chatTypingStyle;
  }
  if (input.language !== undefined) {
    if (!VALID_LANGUAGES.includes(input.language)) {
      throw new AppError(400, 'INVALID_LANGUAGE', 'Invalid language code');
    }
    patch.app_language = input.language;
  }
  if (input.pushNotificationsEnabled !== undefined) {
    patch.push_notifications_enabled = input.pushNotificationsEnabled;
  }

  if (Object.keys(patch).length === 0) {
    const row = await loadPreferencesRow(authUser, accessToken);
    return mapRow(authUser, row);
  }

  const supabase = createSupabaseUserClient(accessToken);
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', authUser.id)
    .select('app_theme, chat_typing_style, app_language, push_notifications_enabled, email')
    .single();

  if (error) {
    throw new AppError(500, 'SETTINGS_UPDATE_FAILED', error.message);
  }

  return mapRow(authUser, data as PreferencesRow);
}
