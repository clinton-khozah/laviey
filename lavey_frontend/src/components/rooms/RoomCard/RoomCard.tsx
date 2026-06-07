import type { VibeRoom } from '@/types';
import './RoomCard.css';

interface RoomCardProps {
  room: VibeRoom;
  isJoining: boolean;
  onJoin: () => void;
}

function statusLabel(room: VibeRoom): string {
  if (room.status === 'live') return 'LIVE';
  if (room.status === 'starting-soon') return `Starts in ${room.startsInMinutes}m`;
  return `In ${room.startsInMinutes}m`;
}

export function RoomCard({ room, isJoining, onJoin }: RoomCardProps) {
  const isLive = room.status === 'live';

  return (
    <article className={`room-card ${isLive ? 'room-card--live' : ''}`}>
      <div
        className="room-card__cover"
        style={{ backgroundImage: `url(${room.coverImage})` }}
      >
        <span className={`room-card__badge room-card__badge--${room.status}`}>
          {isLive && <span className="room-card__pulse" />}
          {statusLabel(room)}
        </span>
        <span className="room-card__count">
          {room.participantCount}/{room.maxParticipants}
        </span>
      </div>
      <div className="room-card__body">
        <h3 className="room-card__title">{room.title}</h3>
        <p className="room-card__topic">{room.topic}</p>
        <p className="room-card__host">Hosted by {room.hostName}</p>
        <div className="room-card__tags">
          {room.tags.map((tag) => (
            <span key={tag} className="room-card__tag">
              #{tag}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="room-card__join"
          onClick={onJoin}
          disabled={isJoining}
        >
          {isJoining ? 'Joining…' : isLive ? 'Join Zoom room' : 'Reserve spot'}
        </button>
      </div>
    </article>
  );
}
