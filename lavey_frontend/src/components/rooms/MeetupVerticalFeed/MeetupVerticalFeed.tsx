import type { OnlineDate } from '@/types';
import { OnlineDateCard } from '@/components/rooms/OnlineDateCard';
import './MeetupVerticalFeed.css';

export interface MeetupVerticalFeedProps {
  dates: OnlineDate[];
  joiningId: string | null;
  deletingId?: string | null;
  className?: string;
  onJoin: (date: OnlineDate) => void;
  onCopyCode: (code: string) => void;
  onCopyLink: (link: string) => void;
  onEdit?: (date: OnlineDate) => void;
  onDelete?: (date: OnlineDate) => void;
  onHostClick?: (date: OnlineDate) => void;
  onProfileClick?: (userId: string) => void;
}

export function MeetupVerticalFeed({
  dates,
  joiningId,
  deletingId = null,
  className = '',
  onJoin,
  onCopyCode,
  onCopyLink,
  onEdit,
  onDelete,
  onHostClick,
  onProfileClick,
}: MeetupVerticalFeedProps) {
  return (
    <div
      className={`meetup-vertical-feed ${className}`.trim()}
      aria-label="Meetups for you"
    >
      {dates.map((date) => (
        <div key={date.id} className="meetup-vertical-feed__item">
          <OnlineDateCard
            layout="feed"
            date={date}
            isJoining={joiningId === date.id}
            isDeleting={deletingId === date.id}
            onCopyCode={onCopyCode}
            onCopyLink={onCopyLink}
            onJoin={() => onJoin(date)}
            onEdit={date.isHostedByYou ? onEdit : undefined}
            onDelete={date.isHostedByYou ? onDelete : undefined}
            onHostClick={onHostClick}
            onProfileClick={onProfileClick}
          />
        </div>
      ))}
    </div>
  );
}
