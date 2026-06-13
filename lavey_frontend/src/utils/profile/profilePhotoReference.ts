import { hasCustomProfileAvatar } from '@/utils/discover/discoverProfileReady';
import { getStoredProfileAvatar } from '@/utils/profile/profileAvatarStorage';

/** Profile photo URL used to verify the user appears in post uploads. */
export function resolveProfilePhotoReferenceUrl(
  userId: string | undefined,
  avatarUrl: string | undefined,
): string | null {
  const stored = userId ? getStoredProfileAvatar(userId) : null;
  const candidate = stored ?? avatarUrl ?? null;
  if (!candidate || !hasCustomProfileAvatar(candidate)) return null;
  return candidate;
}
