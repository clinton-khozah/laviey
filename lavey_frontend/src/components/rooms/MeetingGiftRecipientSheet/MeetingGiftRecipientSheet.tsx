import { ProfileSheet } from '@/components/profile/ProfileSheet';
import type { MeetingParticipant } from '@/types';
import './MeetingGiftRecipientSheet.css';

interface MeetingGiftRecipientSheetProps {
  open: boolean;
  participants: MeetingParticipant[];
  onClose: () => void;
  onSelect: (participant: MeetingParticipant) => void;
}

export function MeetingGiftRecipientSheet({
  open,
  participants,
  onClose,
  onSelect,
}: MeetingGiftRecipientSheetProps) {
  return (
    <ProfileSheet open={open} title="Send gift to" onClose={onClose} fromTop hideHandle>
      <p className="meeting-gift-recipient-sheet__lead">
        Choose who should receive your gift in this meetup.
      </p>
      <ul className="meeting-gift-recipient-sheet__list" role="listbox" aria-label="Gift recipients">
        {participants.map((participant) => (
          <li key={participant.id} role="option">
            <button
              type="button"
              className="meeting-gift-recipient-sheet__option"
              onClick={() => onSelect(participant)}
            >
              {participant.avatarUrl ? (
                <img
                  src={participant.avatarUrl}
                  alt=""
                  className="meeting-gift-recipient-sheet__avatar"
                />
              ) : (
                <span className="meeting-gift-recipient-sheet__avatar meeting-gift-recipient-sheet__avatar--fallback">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="meeting-gift-recipient-sheet__meta">
                <span className="meeting-gift-recipient-sheet__name">{participant.name}</span>
                {participant.isHost && (
                  <span className="meeting-gift-recipient-sheet__tag">Host</span>
                )}
              </span>
              <span className="meeting-gift-recipient-sheet__chevron" aria-hidden>
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </ProfileSheet>
  );
}
