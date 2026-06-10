import { useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { usesBackendMeetups } from '@/config/env';
import { matchService } from '@/services';
import type { CreateDateInput, DateVisibility } from '@/types';
import { getMatchedConversations } from '@/utils/meeting/meetupAccess';
import './CreateDateSheet.css';

interface CreateDateSheetProps {
  open: boolean;
  isCreating: boolean;
  error?: string | null;
  onClose: () => void;
  onCreate: (input: CreateDateInput) => Promise<void>;
}

interface InviteMatchOption {
  userId: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
}

const TIME_OPTIONS = [
  { label: 'In 15 min', minutes: 15 },
  { label: 'In 1 hour', minutes: 60 },
  { label: 'Later today', minutes: 180 },
];

export function CreateDateSheet({ open, isCreating, error, onClose, onCreate }: CreateDateSheetProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [visibility, setVisibility] = useState<DateVisibility>('public');
  const [inviteProfileId, setInviteProfileId] = useState('');
  const [startsInMinutes, setStartsInMinutes] = useState(15);
  const [formError, setFormError] = useState<string | null>(null);
  const [matchOptions, setMatchOptions] = useState<InviteMatchOption[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (usesBackendMeetups()) {
      setLoadingMatches(true);
      void matchService
        .listMatches()
        .then((matches) =>
          setMatchOptions(
            matches.map((match) => ({
              userId: match.userId,
              name: match.name,
              avatar: match.avatar,
            })),
          ),
        )
        .catch(() => setMatchOptions([]))
        .finally(() => setLoadingMatches(false));
      return;
    }

    setMatchOptions(
      getMatchedConversations().map((conversation) => ({
        userId: conversation.participantProfileId,
        name: conversation.participantName,
        avatar: conversation.participantAvatar,
        isOnline: conversation.isOnline,
      })),
    );
  }, [open]);

  const isPrivate = visibility === 'private';
  const selectedMatch = matchOptions.find((match) => match.userId === inviteProfileId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) return;

    if (isPrivate) {
      if (!inviteProfileId) {
        setFormError('Pick a match to invite — private meetups are 1-on-1');
        return;
      }
      await onCreate({
        title: title.trim(),
        topic: topic.trim() || 'Video meetup with your match',
        visibility: 'private',
        mode: 'invite',
        inviteToProfileId: inviteProfileId,
        inviteToName: selectedMatch?.name,
        startsInMinutes,
      });
    } else {
      await onCreate({
        title: title.trim(),
        topic: topic.trim() || 'Open video meetup — anyone with the code can join',
        visibility: 'public',
        mode: 'post',
        startsInMinutes,
      });
    }

    setTitle('');
    setTopic('');
    setInviteProfileId('');
    onClose();
  };

  return (
    <ProfileSheet open={open} title="Schedule meetup" onClose={onClose} fromTop hideHandle>
      <form className="create-date-sheet" onSubmit={(e) => void handleSubmit(e)}>
        <label className="create-date-sheet__label">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Coffee chat, trivia night…"
            maxLength={60}
            required
          />
        </label>

        <label className="create-date-sheet__label">
          What to expect
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="15 min · cameras optional"
            maxLength={120}
          />
        </label>

        <fieldset className="create-date-sheet__fieldset">
          <legend>Visibility</legend>
          <div className="create-date-sheet__visibility">
            <div className="create-date-sheet__visibility-text">
              <span className="create-date-sheet__visibility-label">
                {isPrivate ? 'Private' : 'Public'}
              </span>
              <span className="create-date-sheet__help">
                {isPrivate
                  ? 'Invite one match · code unlocks after they accept'
                  : 'Listed for anyone with the room code — no invite needed'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              className={`create-date-sheet__switch ${isPrivate ? 'create-date-sheet__switch--on' : ''}`}
              aria-checked={isPrivate}
              aria-label={isPrivate ? 'Private meetup' : 'Public meetup'}
              onClick={() => {
                const nextPrivate = !isPrivate;
                setVisibility(nextPrivate ? 'private' : 'public');
                if (!nextPrivate) setInviteProfileId('');
              }}
            />
          </div>
        </fieldset>

        {isPrivate && (
          <fieldset className="create-date-sheet__fieldset">
            <legend>Invite your match</legend>
            {loadingMatches ? (
              <p className="create-date-sheet__empty">Loading your matches…</p>
            ) : matchOptions.length === 0 ? (
              <p className="create-date-sheet__empty">
                Match with someone on For You first — you can only invite matches to private meetups.
              </p>
            ) : (
              <ul className="create-date-sheet__invite-list" role="listbox" aria-label="Choose a match">
                {matchOptions.map((match) => {
                  const selected = inviteProfileId === match.userId;
                  return (
                    <li key={match.userId} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        className={`create-date-sheet__invite ${selected ? 'create-date-sheet__invite--selected' : ''}`}
                        onClick={() => setInviteProfileId(match.userId)}
                      >
                        <span className="create-date-sheet__invite-avatar-wrap">
                          <img
                            src={match.avatar}
                            alt=""
                            className="create-date-sheet__invite-avatar"
                          />
                          {match.isOnline && (
                            <span className="create-date-sheet__invite-online" aria-label="Online" />
                          )}
                        </span>
                        <span className="create-date-sheet__invite-name">{match.name}</span>
                        {selected && (
                          <span className="create-date-sheet__invite-check" aria-hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
        )}

        <fieldset className="create-date-sheet__fieldset">
          <legend>Starts</legend>
          <div className="create-date-sheet__chips">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                className={`create-date-sheet__chip ${startsInMinutes === opt.minutes ? 'create-date-sheet__chip--active' : ''}`}
                onClick={() => setStartsInMinutes(opt.minutes)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {(formError || error) && (
          <p className="create-date-sheet__error" role="alert">
            {formError ?? error}
          </p>
        )}

        <button
          type="submit"
          className="create-date-sheet__submit"
          disabled={
            isCreating || loadingMatches || (isPrivate && matchOptions.length === 0)
          }
        >
          {isCreating
            ? 'Creating…'
            : isPrivate
              ? 'Send invite'
              : 'Post public meetup'}
        </button>
      </form>
    </ProfileSheet>
  );
};
