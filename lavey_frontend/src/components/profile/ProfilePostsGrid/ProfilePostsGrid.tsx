import type { ProfilePost } from '@/types';
import { formatLikeCount } from '@/utils/profile/formatLikeCount';
import './ProfilePostsGrid.css';

interface ProfilePostsGridProps {
  posts: ProfilePost[];
  onPostClick?: (post: ProfilePost) => void;
  onAdd?: () => void;
  postLimit?: number;
  /** Label for the limit line, e.g. "moments" → "2/5 moments" */
  limitItemLabel?: string;
  addAriaLabel?: string;
  addButtonLabel?: string;
  showLikeCounts?: boolean;
}

function thumbUrl(post: ProfilePost): string {
  return post.type === 'image' ? post.src : (post.poster ?? post.src);
}

export function ProfilePostsGrid({
  posts,
  onPostClick,
  onAdd,
  postLimit,
  limitItemLabel = 'posts',
  addAriaLabel = 'Add new post',
  addButtonLabel = 'New',
  showLikeCounts = true,
}: ProfilePostsGridProps) {
  return (
    <div className="profile-posts-grid-wrap">
      {postLimit !== undefined && (
        <p className="profile-posts-grid__limit" aria-live="polite">
          {posts.length}/{postLimit} {limitItemLabel}
        </p>
      )}
      <div className="profile-posts-grid">
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          className="profile-posts-grid__item"
          style={{ backgroundImage: `url(${thumbUrl(post)})` }}
          aria-label={post.type === 'video' ? 'Play video' : 'View photo'}
          onClick={() => onPostClick?.(post)}
        >
          {post.type === 'video' && (
            <span className="profile-posts-grid__play" aria-hidden>
              ▶
            </span>
          )}
          {showLikeCounts && (
            <span className="profile-posts-grid__likes" aria-hidden>
              <svg viewBox="0 0 24 24" fill="currentColor" className="profile-posts-grid__likes-icon">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {formatLikeCount(post.likeCount ?? 0)}
            </span>
          )}
        </button>
      ))}
      {onAdd && (
        <button
          type="button"
          className="profile-posts-grid__item profile-posts-grid__item--add"
          onClick={onAdd}
          aria-label={addAriaLabel}
        >
          <span className="profile-posts-grid__add-icon">+</span>
          <span className="profile-posts-grid__add-label">{addButtonLabel}</span>
        </button>
      )}
      </div>
    </div>
  );
}
