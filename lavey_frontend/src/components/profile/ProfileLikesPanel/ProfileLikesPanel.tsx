import { useEffect, useMemo, useState } from 'react';
import { ProfileInitialAvatar } from '@/components/ui/ProfileInitialAvatar';
import { usesBackendApi } from '@/config/env';
import { contentService } from '@/services/content/contentService';
import { MOCK_PROFILES } from '@/services/mocks/profile.mock';
import { MOCK_RECEIVED_LIKE_PROFILE_IDS } from '@/services/mocks/likes.mock';
import type { Profile, ReceivedPostLike } from '@/types';
import { hasFeedDisplayMedia } from '@/utils/profile/feedMedia';
import './ProfileLikesPanel.css';

interface ProfileLikesPanelProps {
  profileLikers: Profile[];
  reciprocatedIds: Set<string>;
  isLoadingProfiles?: boolean;
  onLikeBack: (profileId: string) => void;
  onChat?: (profileId: string) => void;
  onProfileClick?: (profile: Profile) => void;
}

interface LikerRow {
  userId: string;
  name: string;
  avatar: string;
  subtitle: string;
  postThumbnail?: string;
  profile?: Profile;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function buildMockPostLikes(reciprocatedIds: Set<string>): ReceivedPostLike[] {
  return MOCK_RECEIVED_LIKE_PROFILE_IDS.map((id) => {
    const profile = MOCK_PROFILES.find((p) => p.id === id);
    if (!profile) return null;
    return {
      userId: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      postId: profile.posts[0]?.id ?? 'mock-post',
      postThumbnail: profile.posts[0]?.src ?? profile.avatar,
      likedBack: reciprocatedIds.has(profile.id),
    } satisfies ReceivedPostLike;
  }).filter((item): item is ReceivedPostLike => item !== null);
}

export function ProfileLikesPanel({
  profileLikers,
  reciprocatedIds,
  isLoadingProfiles = false,
  onLikeBack,
  onChat,
  onProfileClick,
}: ProfileLikesPanelProps) {
  const [postLikes, setPostLikes] = useState<ReceivedPostLike[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (!usesBackendApi()) {
      setPostLikes(buildMockPostLikes(reciprocatedIds));
      return;
    }

    let cancelled = false;
    setLoadingPosts(true);
    void (async () => {
      try {
        const rows = await contentService.getReceivedPostLikes();
        if (!cancelled) setPostLikes(rows);
      } catch {
        if (!cancelled) setPostLikes([]);
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reciprocatedIds]);

  const rows = useMemo(() => {
    const merged = new Map<string, LikerRow>();

    for (const profile of profileLikers) {
      merged.set(profile.id, {
        userId: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        subtitle: `${profile.vibeScore}% vibe · liked you on For You`,
        profile,
      });
    }

    for (const item of postLikes) {
      const existing = merged.get(item.userId);
      if (existing) {
        existing.subtitle = 'Liked your post on For You';
        existing.postThumbnail = item.postThumbnail;
        continue;
      }

      merged.set(item.userId, {
        userId: item.userId,
        name: item.name,
        avatar: item.avatar,
        subtitle: 'Liked your post',
        postThumbnail: item.postThumbnail,
      });
    }

    return Array.from(merged.values());
  }, [profileLikers, postLikes]);

  const loading = isLoadingProfiles || loadingPosts;

  const handleAction = (row: LikerRow) => {
    if (reciprocatedIds.has(row.userId)) {
      onChat?.(row.userId);
      return;
    }
    onLikeBack(row.userId);
  };

  return (
    <div className="profile-likes-panel">
      <div className="profile-likes-panel__intro">
        <h3 className="profile-likes-panel__title">
          {loading
            ? 'Loading likes…'
            : `${rows.length} ${rows.length === 1 ? 'person liked' : 'people liked'} you`}
        </h3>
        <p className="profile-likes-panel__hint">
          Like someone back if you&apos;re interested — when you both like each other, it&apos;s a match.
        </p>
      </div>

      {rows.length > 0 && (
        <ul className="profile-likes-panel__list">
          {rows.map((row) => {
            const alreadyLiked = reciprocatedIds.has(row.userId);
            const avatarSrc = hasFeedDisplayMedia(row.avatar) ? row.avatar : undefined;
            return (
              <li key={row.userId} className="profile-likes-panel__row">
                <button
                  type="button"
                  className="profile-likes-panel__row-main"
                  onClick={() => row.profile && onProfileClick?.(row.profile)}
                  disabled={!row.profile}
                >
                  <ProfileInitialAvatar
                    name={row.name}
                    src={avatarSrc}
                    className="profile-likes-panel__avatar"
                    size="md"
                  />
                  <div className="profile-likes-panel__info">
                    <span className="profile-likes-panel__name">{row.name}</span>
                    <span className="profile-likes-panel__meta">
                      <HeartIcon />
                      {alreadyLiked ? 'Matched' : row.subtitle}
                    </span>
                  </div>
                </button>
                {row.postThumbnail ? (
                  <img src={row.postThumbnail} alt="" className="profile-likes-panel__thumb" />
                ) : null}
                <button
                  type="button"
                  className={`profile-likes-panel__action ${
                    alreadyLiked ? 'profile-likes-panel__action--chat' : 'profile-likes-panel__action--like'
                  }`}
                  onClick={() => handleAction(row)}
                >
                  {alreadyLiked ? (
                    'Chat'
                  ) : (
                    <>
                      <HeartIcon />
                      Like back
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && rows.length === 0 && (
        <p className="profile-likes-panel__empty">
          When someone likes you or your posts on For You, they&apos;ll show up here.
        </p>
      )}
    </div>
  );
}
