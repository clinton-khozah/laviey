import { useEffect, useRef, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { usesBackendMeetups } from '@/config/env';
import { matchService } from '@/services';
import { contentService } from '@/services/content/contentService';
import type { CreateDateInput, DateVisibility } from '@/types';
import { getMatchedConversations } from '@/utils/meeting/meetupAccess';
import {
  defaultMeetupStartLocal,
  maxMeetupStartLocal,
  minMeetupStartLocal,
  parseDatetimeLocal,
  toDatetimeLocalValue,
} from '@/utils/meeting/meetupSchedule';
import { prepareImageForUpload } from '@/utils/media/prepareUploadMedia';
import { nsfwImageUserMessage } from '@/utils/media/nsfwImageCheck';
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
] as const;

function isChipActive(minutes: number, startAtLocal: string): boolean {
  const current = parseDatetimeLocal(startAtLocal);
  if (!current) return false;
  const target = Date.now() + minutes * 60_000;
  return Math.abs(current.getTime() - target) < 2 * 60_000;
}

export function CreateDateSheet({ open, isCreating, error, onClose, onCreate }: CreateDateSheetProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [visibility, setVisibility] = useState<DateVisibility>('public');
  const [inviteProfileId, setInviteProfileId] = useState('');
  const [startAtLocal, setStartAtLocal] = useState(() => defaultMeetupStartLocal(15));
  const [formError, setFormError] = useState<string | null>(null);
  const [matchOptions, setMatchOptions] = useState<InviteMatchOption[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setTopic('');
    setInviteProfileId('');
    setCoverPreview(null);
    setCoverFile(null);
    setFormError(null);
    setStartAtLocal(defaultMeetupStartLocal(15));
  };

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

  const handleCoverPick = async (file: File | null) => {
    if (!file) return;
    setFormError(null);
    try {
      const prepared = await prepareImageForUpload(file);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(prepared);
      setCoverPreview(URL.createObjectURL(prepared));
    } catch (err) {
      setFormError(nsfwImageUserMessage(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) return;

    if (isPrivate) {
      if (!inviteProfileId) {
        setFormError('Pick a match to invite — private meetups are 1-on-1');
        return;
      }
    }

    const startsAtDate = parseDatetimeLocal(startAtLocal);
    if (!startsAtDate) {
      setFormError('Pick a valid start date and time');
      return;
    }
    if (startsAtDate.getTime() < Date.now() + 60_000) {
      setFormError('Start time must be at least 1 minute from now');
      return;
    }
    const maxStart = parseDatetimeLocal(maxMeetupStartLocal());
    if (maxStart && startsAtDate.getTime() > maxStart.getTime()) {
      setFormError('Meetups can be scheduled up to 7 days ahead');
      return;
    }

    let coverImageUrl: string | undefined;
    if (coverFile) {
      setIsUploadingCover(true);
      try {
        coverImageUrl = await contentService.uploadAvatar(coverFile);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Could not upload cover photo');
        setIsUploadingCover(false);
        return;
      }
      setIsUploadingCover(false);
    }

    const base = {
      title: title.trim(),
      startsAt: startsAtDate.toISOString(),
      coverImageUrl,
    };

    if (isPrivate) {
      await onCreate({
        ...base,
        topic: topic.trim() || 'Video meetup with your match',
        visibility: 'private',
        mode: 'invite',
        inviteToProfileId: inviteProfileId,
        inviteToName: selectedMatch?.name,
      });
    } else {
      await onCreate({
        ...base,
        topic: topic.trim() || 'Open video meetup — join from the live list',
        visibility: 'public',
        mode: 'post',
      });
    }

    resetForm();
    onClose();
  };

  const isBusy = isCreating || isUploadingCover;

  return (
    <ProfileSheet open={open} title="Schedule meetup" onClose={onClose} fromTop hideHandle>
      <form className="create-date-sheet" onSubmit={(e) => void handleSubmit(e)}>
        <div className="create-date-sheet__cover-block">
          <button
            type="button"
            className={`create-date-sheet__cover-preview ${coverPreview ? 'create-date-sheet__cover-preview--filled' : ''}`}
            onClick={() => coverInputRef.current?.click()}
            aria-label={coverPreview ? 'Change cover photo' : 'Upload cover photo'}
          >
            {coverPreview ? <img src={coverPreview} alt="" /> : null}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="create-date-sheet__cover-input"
            onChange={(e) => void handleCoverPick(e.target.files?.[0] ?? null)}
          />
        </div>

        <label className="create-date-sheet__label">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            required
          />
        </label>

        <label className="create-date-sheet__label">
          What to expect
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={120}
          />
        </label>

        <fieldset className="create-date-sheet__fieldset">
          <legend>Visibility</legend>
          <div className="create-date-sheet__visibility">
            <span className="create-date-sheet__visibility-label">
              {isPrivate ? 'Private' : 'Public'}
            </span>
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
                className={`create-date-sheet__chip ${isChipActive(opt.minutes, startAtLocal) ? 'create-date-sheet__chip--active' : ''}`}
                onClick={() =>
                  setStartAtLocal(toDatetimeLocalValue(new Date(Date.now() + opt.minutes * 60_000)))
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="datetime-local"
            className="create-date-sheet__datetime"
            value={startAtLocal}
            min={minMeetupStartLocal()}
            max={maxMeetupStartLocal()}
            onChange={(e) => setStartAtLocal(e.target.value)}
            aria-label="Start date and time"
          />
        </fieldset>

        {(formError || error) && (
          <p className="create-date-sheet__error" role="alert">
            {formError ?? error}
          </p>
        )}

        <button
          type="submit"
          className="create-date-sheet__submit"
          disabled={isBusy || loadingMatches || (isPrivate && matchOptions.length === 0)}
        >
          {isBusy
            ? isUploadingCover
              ? 'Uploading cover…'
              : 'Creating…'
            : isPrivate
              ? 'Send invite'
              : 'Post public meetup'}
        </button>
      </form>
    </ProfileSheet>
  );
};
