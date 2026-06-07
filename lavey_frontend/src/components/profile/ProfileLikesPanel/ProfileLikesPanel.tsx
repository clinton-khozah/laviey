import { useEffect, useState } from 'react';
import { contentService } from '@/services/content/contentService';
import { MOCK_PROFILES } from '@/services/mocks/profile.mock';
import { MOCK_RECEIVED_LIKE_PROFILE_IDS } from '@/services/mocks/likes.mock';
import { env } from '@/config/env';
import type { ReceivedPostLike } from '@/types';
import './ProfileLikesPanel.css';

interface ProfileLikesPanelProps {
  reciprocatedIds: Set<string>;
}

export function ProfileLikesPanel({ reciprocatedIds }: ProfileLikesPanelProps) {
  const [received, setReceived] = useState<ReceivedPostLike[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (env.useMockApi) {
      const mock = MOCK_RECEIVED_LIKE_PROFILE_IDS.map((id) => {
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
      setReceived(mock);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const rows = await contentService.getReceivedPostLikes();
        if (!cancelled) setReceived(rows);
      } catch {
        if (!cancelled) setReceived([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reciprocatedIds]);

  const unlocked = received.filter((item) => item.likedBack || reciprocatedIds.has(item.userId));
  const locked = received.filter((item) => !item.likedBack && !reciprocatedIds.has(item.userId));

  return (
    <div className="profile-likes-panel">
      <div className="profile-likes-panel__intro">
        <h3 className="profile-likes-panel__title">
          {loading
            ? 'Loading likes…'
            : `${received.length} ${received.length === 1 ? 'person liked' : 'people liked'} your posts`}
        </h3>
        <p className="profile-likes-panel__hint">
          Tap a post&apos;s like count to see names and user IDs. Like them back on For You to match
          and unlock their profile.
        </p>
      </div>

      {unlocked.length > 0 && (
        <section className="profile-likes-panel__section">
          <h4 className="profile-likes-panel__section-label">Revealed</h4>
          <ul className="profile-likes-panel__list">
            {unlocked.map((item) => (
              <li key={item.userId} className="profile-likes-panel__row profile-likes-panel__row--revealed">
                <img src={item.avatar} alt="" className="profile-likes-panel__avatar" />
                <div className="profile-likes-panel__info">
                  <span className="profile-likes-panel__name">{item.name}</span>
                  <span className="profile-likes-panel__meta">ID: {item.userId}</span>
                </div>
                {item.postThumbnail ? (
                  <img src={item.postThumbnail} alt="" className="profile-likes-panel__thumb" />
                ) : null}
                <span className="profile-likes-panel__flame" aria-hidden>
                  🔥
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {locked.length > 0 && (
        <section className="profile-likes-panel__section">
          <h4 className="profile-likes-panel__section-label">Like back to unlock</h4>
          <ul className="profile-likes-panel__list">
            {locked.map((item) => (
              <li key={item.userId} className="profile-likes-panel__row profile-likes-panel__row--locked">
                <div className="profile-likes-panel__avatar profile-likes-panel__avatar--blur">
                  <img src={item.avatar} alt="" />
                </div>
                <div className="profile-likes-panel__info">
                  <span className="profile-likes-panel__name profile-likes-panel__name--blur">
                    Someone liked your post
                  </span>
                  <span className="profile-likes-panel__meta">Like them on For You to see</span>
                </div>
                {item.postThumbnail ? (
                  <img
                    src={item.postThumbnail}
                    alt=""
                    className="profile-likes-panel__thumb profile-likes-panel__thumb--blur"
                  />
                ) : null}
                <span className="profile-likes-panel__lock" aria-hidden>
                  🔒
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && received.length === 0 && (
        <p className="profile-likes-panel__empty">When someone likes your posts on For You, they&apos;ll show up here.</p>
      )}
    </div>
  );
}
