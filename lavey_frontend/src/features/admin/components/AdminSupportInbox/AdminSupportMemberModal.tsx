import { useEffect, useState } from 'react';
import { APP_IMAGES } from '@/constants/images';
import { adminService } from '@/services/admin/adminService';
import type { AdminUserDetail } from '@/types/admin.types';
import './AdminSupportMemberModal.css';

interface AdminSupportMemberModalProps {
  userId: string;
  fallbackName: string;
  fallbackEmail: string;
  fallbackAvatar: string;
  onClose: () => void;
}

function InboxLogoLoader() {
  return (
    <div className="admin-support-member__loader" aria-busy="true" aria-label="Loading">
      <img src={APP_IMAGES.logo} alt="" className="admin-support-member__loader-logo" />
    </div>
  );
}

export function AdminSupportMemberModal({
  userId,
  fallbackName,
  fallbackEmail,
  fallbackAvatar,
  onClose,
}: AdminSupportMemberModalProps) {
  const [member, setMember] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'posts'>('profile');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void adminService
      .getUserById(userId)
      .then((data) => {
        if (!cancelled) setMember(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load member profile.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const name = member?.name ?? fallbackName;
  const email = member?.email || fallbackEmail;
  const avatar = member?.avatarUrl || fallbackAvatar || APP_IMAGES.logo;
  const posts = member?.profilePosts ?? [];

  return (
    <div className="admin-support-member" role="dialog" aria-modal="true" aria-label={`${name} profile`}>
      <button type="button" className="admin-support-member__backdrop" onClick={onClose} aria-label="Close" />
      <article className="admin-support-member__card">
        <button type="button" className="admin-support-member__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {loading ? (
          <InboxLogoLoader />
        ) : (
          <>
            <header className="admin-support-member__hero">
              <img
                src={avatar}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = APP_IMAGES.logo;
                }}
              />
              <div>
                <h4>{name}</h4>
                <p>{member?.handle ?? email}</p>
                {email && <span>{email}</span>}
              </div>
            </header>

            {error && <p className="admin-support-member__error">{error}</p>}

            <div className="admin-support-member__tabs">
              <button
                type="button"
                className={activeTab === 'profile' ? 'is-active' : ''}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button
                type="button"
                className={activeTab === 'posts' ? 'is-active' : ''}
                onClick={() => setActiveTab('posts')}
              >
                Posts {posts.length > 0 ? `(${posts.length})` : ''}
              </button>
            </div>

            {activeTab === 'profile' ? (
              <div className="admin-support-member__body">
                {member?.bio && (
                  <section>
                    <h5>About</h5>
                    <p>{member.bio}</p>
                  </section>
                )}
                <section className="admin-support-member__grid">
                  <article>
                    <span>Plan</span>
                    <strong>{member?.plan ?? '—'}</strong>
                  </article>
                  <article>
                    <span>Age</span>
                    <strong>{member?.age ?? '—'}</strong>
                  </article>
                  <article>
                    <span>Matches</span>
                    <strong>{member?.matches ?? 0}</strong>
                  </article>
                  <article>
                    <span>Last active</span>
                    <strong>{member?.lastSeen ?? '—'}</strong>
                  </article>
                  {member?.city && (
                    <article>
                      <span>City</span>
                      <strong>{member.city}</strong>
                    </article>
                  )}
                  <article>
                    <span>Quiz</span>
                    <strong>{member?.quizCompletion ?? 0}%</strong>
                  </article>
                </section>
                {member && member.quizAnswers.length > 0 && (
                  <section>
                    <h5>Quiz answers</h5>
                    <ul className="admin-support-member__quiz">
                      {member.quizAnswers.map((item) => (
                        <li key={item.question}>
                          <span>{item.question}</span>
                          <strong>{item.answer}</strong>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            ) : (
              <div className="admin-support-member__posts">
                {posts.length === 0 ? (
                  <p className="admin-support-member__empty-posts">No posts on this profile yet.</p>
                ) : (
                  <div className="admin-support-member__posts-grid">
                    {posts.map((post) => (
                      <figure key={post.id} className="admin-support-member__post">
                        <img
                          src={post.type === 'video' ? post.poster ?? post.src : post.src}
                          alt={post.caption ?? 'Profile post'}
                        />
                        {post.type === 'video' && <em>Video</em>}
                        {post.caption && <figcaption>{post.caption}</figcaption>}
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </article>
    </div>
  );
}
