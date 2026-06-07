import { useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { MOCK_CONVERSATIONS } from '@/services/mocks/message.mock';
import type { CreateDateInput, DateVisibility } from '@/types';
import './CreateDateSheet.css';

interface CreateDateSheetProps {
  open: boolean;
  isCreating: boolean;
  onClose: () => void;
  onCreate: (input: CreateDateInput) => Promise<void>;
}

const TIME_OPTIONS = [
  { label: 'In 15 min', minutes: 15 },
  { label: 'In 1 hour', minutes: 60 },
  { label: 'Later today', minutes: 180 },
];

export function CreateDateSheet({ open, isCreating, onClose, onCreate }: CreateDateSheetProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [visibility, setVisibility] = useState<DateVisibility>('public');
  const [mode, setMode] = useState<'post' | 'invite'>('post');
  const [inviteId, setInviteId] = useState(MOCK_CONVERSATIONS[0]?.id ?? '');
  const [startsInMinutes, setStartsInMinutes] = useState(15);

  const isPrivate = visibility === 'private';
  const selectedInvite = MOCK_CONVERSATIONS.find((c) => c.id === inviteId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate({
      title: title.trim(),
      topic: topic.trim() || 'Video meetup before you match',
      visibility,
      mode: visibility === 'private' ? 'invite' : mode,
      inviteToName:
        mode === 'invite' || visibility === 'private'
          ? selectedInvite?.participantName
          : undefined,
      startsInMinutes,
    });
    setTitle('');
    setTopic('');
    onClose();
  };

  return (
    <ProfileSheet open={open} title="Schedule meetup" onClose={onClose} compact hideHandle>
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
                {isPrivate ? 'Invite only · 1-on-1' : 'Listed for anyone with the code'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              className={`create-date-sheet__switch ${isPrivate ? 'create-date-sheet__switch--on' : ''}`}
              aria-checked={isPrivate}
              aria-label={isPrivate ? 'Private meetup' : 'Public meetup'}
              onClick={() => {
                const next = isPrivate ? 'public' : 'private';
                setVisibility(next);
                if (next === 'private') setMode('invite');
              }}
            />
          </div>
        </fieldset>

        {visibility === 'public' && (
          <fieldset className="create-date-sheet__fieldset">
            <legend>How to share</legend>
            <div className="create-date-sheet__seg">
              <button
                type="button"
                className={mode === 'post' ? 'create-date-sheet__seg--active' : ''}
                onClick={() => setMode('post')}
              >
                Post to board
              </button>
              <button
                type="button"
                className={mode === 'invite' ? 'create-date-sheet__seg--active' : ''}
                onClick={() => setMode('invite')}
              >
                Invite a match
              </button>
            </div>
          </fieldset>
        )}

        {(mode === 'invite' || visibility === 'private') && (
          <fieldset className="create-date-sheet__fieldset">
            <legend>Invite</legend>
            <ul className="create-date-sheet__invite-list" role="listbox" aria-label="Choose who to invite">
              {MOCK_CONVERSATIONS.map((c) => {
                const selected = inviteId === c.id;
                return (
                  <li key={c.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      className={`create-date-sheet__invite ${selected ? 'create-date-sheet__invite--selected' : ''}`}
                      onClick={() => setInviteId(c.id)}
                    >
                      <span className="create-date-sheet__invite-avatar-wrap">
                        <img
                          src={c.participantAvatar}
                          alt=""
                          className="create-date-sheet__invite-avatar"
                        />
                        {c.isOnline && (
                          <span className="create-date-sheet__invite-online" aria-label="Online" />
                        )}
                      </span>
                      <span className="create-date-sheet__invite-name">{c.participantName}</span>
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

        <button type="submit" className="create-date-sheet__submit" disabled={isCreating}>
          {isCreating
            ? 'Creating…'
            : mode === 'invite' || visibility === 'private'
              ? 'Send invite'
              : 'Post meetup'}
        </button>
      </form>
    </ProfileSheet>
  );
}
