import type {
  OnboardingGender,
  OnboardingInterestedIn,
  OnboardingOrientation,
  Profile,
  ProfileGender,
} from '@/types';

const GENDER_LABELS: Record<string, string> = {
  man: 'Man',
  woman: 'Woman',
  nonbinary: 'Non-binary',
  'prefer-not-to-say': 'Prefer not to say',
};

const ORIENTATION_LABELS: Record<string, string> = {
  straight: 'Straight',
  gay: 'Gay',
  lesbian: 'Lesbian',
  bisexual: 'Bisexual',
  pansexual: 'Pansexual',
  queer: 'Queer',
  'prefer-not-to-say': 'Prefer not to say',
};

const INTERESTED_IN_LABELS: Record<string, string> = {
  men: 'Men',
  women: 'Women',
  nonbinary: 'Non-binary people',
  everyone: 'Everyone',
};

export function profileGenderLabel(
  gender?: ProfileGender | OnboardingGender | string | null,
): string | null {
  if (!gender || gender === 'prefer-not-to-say') return null;
  return GENDER_LABELS[gender] ?? null;
}

export function profileOrientationLabel(
  orientation?: OnboardingOrientation | string | null,
): string | null {
  if (!orientation || orientation === 'prefer-not-to-say') return null;
  return ORIENTATION_LABELS[orientation] ?? null;
}

export function profileInterestedInLabel(
  interestedIn?: OnboardingInterestedIn | OnboardingInterestedIn[] | string | string[] | null,
): string | null {
  if (!interestedIn) return null;
  const keys = Array.isArray(interestedIn) ? interestedIn : [interestedIn];
  if (keys.includes('everyone')) return 'Everyone';
  const labels = keys.map((key) => INTERESTED_IN_LABELS[key]).filter(Boolean);
  if (labels.length === 0) return null;
  return labels.join(', ');
}

export interface ProfileIdentityChip {
  key: string;
  label: string;
}

/** Gender, orientation, and who they're interested in — for profile modals. */
export function getProfileIdentityChips(profile: Pick<Profile, 'gender' | 'orientation' | 'interestedIn'>): ProfileIdentityChip[] {
  const chips: ProfileIdentityChip[] = [];

  const gender = profileGenderLabel(profile.gender);
  if (gender) chips.push({ key: 'gender', label: gender });

  const orientation = profileOrientationLabel(profile.orientation);
  if (orientation) chips.push({ key: 'orientation', label: orientation });

  const interestedIn = profileInterestedInLabel(profile.interestedIn);
  if (interestedIn) {
    chips.push({
      key: 'interested-in',
      label: interestedIn === 'Everyone' ? 'Into everyone' : `Into ${interestedIn.toLowerCase()}`,
    });
  }

  return chips;
}
