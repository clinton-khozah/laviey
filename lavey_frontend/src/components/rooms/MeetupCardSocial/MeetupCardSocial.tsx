import { useRef, useState } from 'react';
import { MEETUP_COMMENT_EMOJIS } from '@/constants/meeting/meetupCommentEmojis';
import { useAuth, useUserProfile } from '@/hooks';
import { useMeetingChat } from '@/hooks/rooms/useMeetingChat';
import { useMeetupCardSocial } from '@/hooks/rooms/useMeetupCardSocial';
import type { MeetingChatMessage } from '@/types';
import './MeetupCardSocial.css';

interface MeetupCardSocialProps {
  meetupId: string;
  onJoin: () => void;
  isJoining?: boolean;
  joinLabel?: string;
  variant?: 'bar' | 'rail';
  hostAvatar?: string;
  hostName?: string;
  onHostClick?: () => void;
  onProfileClick?: (userId: string) => void;
  showHostAvatar?: boolean;
}

interface ReplyTarget {
  id: string;
  name: string;
}

function HeartIcon({ filled, small }: { filled?: boolean; small?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`meetup-card-social__heart-icon ${small ? 'meetup-card-social__heart-icon--sm' : ''}`}
    >
      <path
        className={`meetup-card-social__heart-shape ${filled ? 'meetup-card-social__heart-shape--active' : ''}`}
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

function JoinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function nameInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function canOpenProfile(userId: string): boolean {
  return Boolean(userId && userId !== 'guest');
}

function CommentAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="meetup-card-social__comment-avatar-img" />;
  }
  return (
    <span className="meetup-card-social__comment-avatar-fallback" aria-hidden>
      {nameInitial(name)}
    </span>
  );
}

function CommentRow({
  comment,
  localUserId,
  onToggleLike,
  onReply,
  onProfileClick,
}: {
  comment: MeetingChatMessage;
  localUserId: string;
  onToggleLike: (messageId: string) => void;
  onReply: (comment: MeetingChatMessage) => void;
  onProfileClick?: (userId: string) => void;
}) {
  const likeCount = comment.likeUserIds?.length ?? 0;
  const userLiked = comment.likeUserIds?.includes(localUserId) ?? false;
  const profileClickable = Boolean(onProfileClick && canOpenProfile(comment.fromUserId));

  const openAuthorProfile = () => {
    if (!profileClickable || !onProfileClick) return;
    onProfileClick(comment.fromUserId);
  };

  return (
    <li className="meetup-card-social__comment">
      {profileClickable ? (
        <button
          type="button"
          className="meetup-card-social__comment-avatar meetup-card-social__comment-avatar--btn"
          onClick={openAuthorProfile}
          aria-label={`View ${comment.fromName}'s profile`}
        >
          <CommentAvatar name={comment.fromName} avatarUrl={comment.fromAvatarUrl} />
        </button>
      ) : (
        <div className="meetup-card-social__comment-avatar">
          <CommentAvatar name={comment.fromName} avatarUrl={comment.fromAvatarUrl} />
        </div>
      )}
      <div className="meetup-card-social__comment-body">
        {profileClickable ? (
          <button
            type="button"
            className="meetup-card-social__comment-name meetup-card-social__comment-name--btn"
            onClick={openAuthorProfile}
          >
            {comment.fromName}
          </button>
        ) : (
          <p className="meetup-card-social__comment-name">{comment.fromName}</p>
        )}
        {comment.replyToName ? (
          <p className="meetup-card-social__comment-reply-tag">
            Replying to <span>{comment.replyToName}</span>
          </p>
        ) : null}
        <p className="meetup-card-social__comment-text">{comment.text}</p>
        <div className="meetup-card-social__comment-actions">
          <button
            type="button"
            className={`meetup-card-social__comment-action ${userLiked ? 'meetup-card-social__comment-action--active' : ''}`}
            onClick={() => onToggleLike(comment.id)}
            aria-pressed={userLiked}
            aria-label={`Like comment${likeCount ? `, ${likeCount} likes` : ''}`}
          >
            <HeartIcon filled={userLiked} small />
            <span>{likeCount > 0 ? likeCount : 'Like'}</span>
          </button>
          <button
            type="button"
            className="meetup-card-social__comment-action"
            onClick={() => onReply(comment)}
            aria-label={`Reply to ${comment.fromName}`}
          >
            <CommentIcon />
            <span>Reply</span>
          </button>
        </div>
      </div>
    </li>
  );
}

export function MeetupCardSocial({
  meetupId,
  onJoin,
  isJoining = false,
  joinLabel = 'Join',
  variant = 'bar',
  hostAvatar,
  hostName = 'Host',
  onHostClick,
  onProfileClick,
  showHostAvatar = true,
}: MeetupCardSocialProps) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const localUserId = user?.id ?? 'guest';
  const localDisplayName = profile?.displayName ?? user?.displayName ?? 'You';
  const localAvatarUrl = profile?.avatarUrl ?? '';
  const inputRef = useRef<HTMLInputElement>(null);

  const { likeCount, userLiked, toggleLike } = useMeetupCardSocial({
    meetupId,
    localUserId,
    localDisplayName,
  });

  const { messages: comments, sendMessage, toggleMessageLike } = useMeetingChat({
    meetupId,
    localUserId,
    localDisplayName,
    localAvatarUrl,
  });

  const [draft, setDraft] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);

  const insertEmoji = (emoji: string) => {
    setDraft((prev) => `${prev}${emoji}`.slice(0, 500));
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sent = sendMessage(draft, {
      replyToId: replyingTo?.id,
      replyToName: replyingTo?.name,
    });
    if (sent) {
      setDraft('');
      setReplyingTo(null);
      setCommentsOpen(true);
    }
  };

  const startReply = (comment: MeetingChatMessage) => {
    setReplyingTo({ id: comment.id, name: comment.fromName });
    setCommentsOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const openComments = () => setCommentsOpen(true);
  const closeComments = () => {
    setCommentsOpen(false);
    setReplyingTo(null);
    setEmojiOpen(false);
  };
  const isRail = variant === 'rail';

  const commentsPanel = commentsOpen ? (
    <>
      {isRail && (
        <button
          type="button"
          className="meetup-card-social__comments-backdrop"
          onClick={closeComments}
          aria-label="Close comments"
        />
      )}
      <div className={`meetup-card-social__comments ${isRail ? 'meetup-card-social__comments--sheet' : ''}`}>
        {isRail && (
          <div className="meetup-card-social__comments-head">
            <span className="meetup-card-social__comments-title">Comments</span>
            <button
              type="button"
              className="meetup-card-social__comments-close"
              onClick={closeComments}
              aria-label="Close comments"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="meetup-card-social__comments-scroll">
          {comments.length === 0 ? (
            <p className="meetup-card-social__comments-empty">
              No comments yet. Messages here are shared with the live meetup.
            </p>
          ) : (
            <ul className="meetup-card-social__comment-list">
              {comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  localUserId={localUserId}
                  onToggleLike={toggleMessageLike}
                  onReply={startReply}
                  onProfileClick={onProfileClick}
                />
              ))}
            </ul>
          )}
        </div>

        {replyingTo ? (
          <div className="meetup-card-social__reply-banner">
            <span>
              Replying to <strong>{firstName(replyingTo.name)}</strong>
            </span>
            <button
              type="button"
              className="meetup-card-social__reply-cancel"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancel reply"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}

        {emojiOpen ? (
          <div className="meetup-card-social__emoji-picker" role="group" aria-label="Choose emoji">
            {MEETUP_COMMENT_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="meetup-card-social__emoji-btn"
                onClick={() => insertEmoji(emoji)}
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        <form className="meetup-card-social__comment-form" onSubmit={handleSubmit}>
          <div className="meetup-card-social__composer-avatar">
            <CommentAvatar name={localDisplayName} avatarUrl={localAvatarUrl || undefined} />
          </div>
          <button
            type="button"
            className={`meetup-card-social__emoji-toggle ${emojiOpen ? 'meetup-card-social__emoji-toggle--active' : ''}`}
            onClick={() => setEmojiOpen((open) => !open)}
            aria-label="Add emoji"
            aria-expanded={emojiOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            className="meetup-card-social__comment-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              replyingTo ? `Reply to ${firstName(replyingTo.name)}…` : 'Add a comment…'
            }
            maxLength={500}
            aria-label="Meetup comment"
          />
          <button
            type="submit"
            className="meetup-card-social__comment-send"
            disabled={!draft.trim()}
            aria-label="Post comment"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </>
  ) : null;

  const actionRail = (
    <aside className="meetup-card-social meetup-card-social--rail" aria-label="Meetup actions">
      {showHostAvatar && onHostClick && (
        <button
          type="button"
          className="meetup-card-social__rail-avatar"
          onClick={onHostClick}
          aria-label={`View ${hostName}'s profile`}
        >
          {hostAvatar ? (
            <img src={hostAvatar} alt="" />
          ) : (
            <span className="meetup-card-social__rail-avatar-fallback">{nameInitial(hostName)}</span>
          )}
        </button>
      )}

      <button
        type="button"
        className={`meetup-card-social__rail-btn ${userLiked ? 'meetup-card-social__rail-btn--active' : ''}`}
        onClick={toggleLike}
        aria-pressed={userLiked}
        aria-label={`Like${likeCount ? `, ${likeCount}` : ''}`}
      >
        <HeartIcon filled={userLiked} />
        <span>{likeCount > 0 ? likeCount : 'Like'}</span>
      </button>

      <button
        type="button"
        className={`meetup-card-social__rail-btn ${commentsOpen ? 'meetup-card-social__rail-btn--active' : ''}`}
        onClick={openComments}
        aria-expanded={commentsOpen}
        aria-label="Comment"
      >
        <CommentIcon />
        <span>{comments.length > 0 ? comments.length : 'Comment'}</span>
      </button>

      <button
        type="button"
        className="meetup-card-social__rail-btn meetup-card-social__rail-btn--join"
        onClick={onJoin}
        disabled={isJoining}
      >
        <JoinIcon />
        <span>{isJoining ? '…' : joinLabel}</span>
      </button>
    </aside>
  );

  if (isRail) {
    return (
      <div className="meetup-card-social-wrap meetup-card-social-wrap--rail">
        {!commentsOpen && actionRail}
        {commentsPanel}
      </div>
    );
  }

  return (
    <section className="meetup-card-social" aria-label="Meetup reactions and comments">
      {!commentsOpen && (
        <div className="meetup-card-social__actions">
          <button
            type="button"
            className={`meetup-card-social__action ${userLiked ? 'meetup-card-social__action--active' : ''}`}
            onClick={toggleLike}
            aria-pressed={userLiked}
          >
            <HeartIcon filled={userLiked} />
            <span>Like</span>
          </button>
          <button
            type="button"
            className={`meetup-card-social__action ${commentsOpen ? 'meetup-card-social__action--active' : ''}`}
            onClick={openComments}
            aria-expanded={commentsOpen}
          >
            <CommentIcon />
            <span>Comment</span>
          </button>
          <button
            type="button"
            className="meetup-card-social__action meetup-card-social__action--join"
            onClick={onJoin}
            disabled={isJoining}
          >
            <JoinIcon />
            <span>{isJoining ? 'Connecting…' : joinLabel}</span>
          </button>
        </div>
      )}
      {commentsPanel}
    </section>
  );
}
