import { useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import type { OnlineDate } from '@/types';
import './JoinDateModal.css';

interface JoinDateModalProps {
  open: boolean;
  date: OnlineDate | null;
  initialCode?: string;
  isJoining: boolean;
  error?: string | null;
  onClose: () => void;
  onJoin: (accessCode: string) => void;
}

export function JoinDateModal({
  open,
  date,
  initialCode = '',
  isJoining,
  error,
  onClose,
  onJoin,
}: JoinDateModalProps) {
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    if (open) setCode(initialCode);
  }, [open, initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onJoin(code.trim());
  };

  return (
    <ProfileSheet open={open} title="Enter room code" onClose={onClose}>
      <div className="join-date-modal">
        {date && (
          <>
            <p className="join-date-modal__title">{date.title}</p>
            <p className="join-date-modal__host">
              {date.isHostedByYou ? 'Your meetup' : `With ${date.hostName}`}
            </p>
          </>
        )}
        <p className="join-date-modal__hint">
          Like a video meeting — only people with the code can join.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="join-date-modal__label" htmlFor="join-date-code">
            Access code
          </label>
          <input
            id="join-date-code"
            type="text"
            className="join-date-modal__input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-0000"
            autoCapitalize="characters"
            autoComplete="off"
          />
          {error && <p className="join-date-modal__error">{error}</p>}
          <button type="submit" className="join-date-modal__submit" disabled={isJoining}>
            {isJoining ? 'Connecting…' : 'Join video meetup'}
          </button>
        </form>
      </div>
    </ProfileSheet>
  );
}
