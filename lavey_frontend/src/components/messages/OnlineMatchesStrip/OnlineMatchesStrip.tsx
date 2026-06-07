import type { Conversation } from '@/types';
import './OnlineMatchesStrip.css';

interface OnlineMatchesStripProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onAvatarClick: (conversation: Conversation) => void;
}

export function OnlineMatchesStrip({
  conversations,
  onSelect,
  onAvatarClick,
}: OnlineMatchesStripProps) {
  const online = conversations.filter((c) => c.isOnline);
  if (online.length === 0) return null;

  return (
    <section className="online-strip" aria-label="Online matches">
      <h2 className="online-strip__title">Online now</h2>
      <div className="online-strip__scroll">
        {online.map((c) => (
          <div key={c.id} className="online-strip__item">
            <button
              type="button"
              className="online-strip__avatar-wrap"
              onClick={() => onAvatarClick(c)}
              aria-label={`View ${c.participantName}'s profile`}
            >
              <img src={c.participantAvatar} alt="" className="online-strip__avatar" />
              {c.unreadCount > 0 && (
                <span className="online-strip__badge">{c.unreadCount}</span>
              )}
            </button>
            <button
              type="button"
              className="online-strip__name-btn"
              onClick={() => onSelect(c.id)}
            >
              {c.participantName.split(' ')[0]}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
