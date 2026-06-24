import type { ProfileGender } from '@/types';

const GENDER_ALIASES: Record<string, ProfileGender> = {
  man: 'man',
  men: 'man',
  male: 'man',
  woman: 'woman',
  women: 'woman',
  female: 'woman',
  nonbinary: 'nonbinary',
  'non-binary': 'nonbinary',
  nb: 'nonbinary',
};

/** Map API / legacy gender strings onto discover filter gender keys. */
export function normalizeProfileGender(value?: string | null): ProfileGender | undefined {
  if (!value || value === 'prefer-not-to-say') return undefined;
  const key = value.toLowerCase().trim();
  return GENDER_ALIASES[key];
}
