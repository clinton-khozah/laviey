import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppOverlay } from '@/components/ui/AppOverlay';
import type { OnlineDate } from '@/types';
import { meetupRequiresAccessCode } from '@/utils/meeting/meetupJoinAccess';
import { buildMeetupJoinLink } from '@/utils/meeting/meetupJoinLink';
import './MeetupCardMenuSheet.css';

export interface MeetupCardMenuSheetProps {
  open: boolean;
  date: OnlineDate | null;
  onClose: () => void;
  onEdit?: (date: OnlineDate) => void;
  onDelete?: (date: OnlineDate) => void;
  onJoin?: () => void;
  onViewHost?: () => void;
  onCopyCode?: (code: string) => void;
  onCopyLink?: (link: string) => void;
}

type MenuOption = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
};

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <span className="meetup-card-menu__icon" aria-hidden>
      {children}
    </span>
  );
}

function IconEdit() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </MenuIcon>
  );
}

function IconLink() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    </MenuIcon>
  );
}

function IconCode() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    </MenuIcon>
  );
}

function IconTrash() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </MenuIcon>
  );
}

function IconJoin() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </MenuIcon>
  );
}

function IconUser() {
  return (
    <MenuIcon>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </MenuIcon>
  );
}

export function MeetupCardMenuSheet({
  open,
  date,
  onClose,
  onEdit,
  onDelete,
  onJoin,
  onViewHost,
  onCopyCode,
  onCopyLink,
}: MeetupCardMenuSheetProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!date) return null;

  const isHost = Boolean(date.isHostedByYou);
  const joinLink = date.joinLink ?? buildMeetupJoinLink(date.accessCode);
  const showCode = meetupRequiresAccessCode(date);

  const pick = (action: () => void) => {
    action();
    onClose();
  };

  const options: MenuOption[] = [];

  if (isHost) {
    if (onEdit) {
      options.push({
        id: 'edit',
        label: 'Edit meetup',
        icon: <IconEdit />,
        onClick: () => pick(() => onEdit(date)),
      });
    }
    if (onCopyLink) {
      options.push({
        id: 'copy-link',
        label: 'Copy join link',
        icon: <IconLink />,
        onClick: () => pick(() => onCopyLink(joinLink)),
      });
    }
    if (showCode && onCopyCode) {
      options.push({
        id: 'copy-code',
        label: 'Copy room code',
        icon: <IconCode />,
        onClick: () => pick(() => onCopyCode(date.accessCode)),
      });
    }
    if (onDelete) {
      options.push({
        id: 'delete',
        label: 'Delete meetup',
        icon: <IconTrash />,
        onClick: () => pick(() => onDelete(date)),
        danger: true,
        dividerBefore: options.length > 0,
      });
    }
  } else {
    if (onJoin) {
      options.push({
        id: 'join',
        label: 'Join meetup',
        icon: <IconJoin />,
        onClick: () => pick(() => onJoin()),
      });
    }
    if (onViewHost) {
      options.push({
        id: 'view-host',
        label: 'View host',
        icon: <IconUser />,
        onClick: () => pick(() => onViewHost()),
      });
    }
    if (onCopyLink && date.visibility === 'public') {
      options.push({
        id: 'copy-link',
        label: 'Copy join link',
        icon: <IconLink />,
        onClick: () => pick(() => onCopyLink(joinLink)),
      });
    }
    if (showCode && onCopyCode) {
      options.push({
        id: 'copy-code',
        label: 'Copy room code',
        icon: <IconCode />,
        onClick: () => pick(() => onCopyCode(date.accessCode)),
      });
    }
  }

  return (
    <AppOverlay>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="meetup-card-menu__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-label="Close"
            />
            <div className="meetup-card-menu__center" role="presentation">
              <motion.div
                className="meetup-card-menu"
                role="dialog"
                aria-modal="true"
                aria-labelledby="meetup-card-menu-title"
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 6 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              >
                <header className="meetup-card-menu__header">
                  <h2 id="meetup-card-menu-title" className="meetup-card-menu__title">
                    Meetup options
                  </h2>
                  <button
                    type="button"
                    className="meetup-card-menu__close"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </header>

                <p className="meetup-card-menu__subtitle" title={date.title}>
                  {date.title}
                </p>

                <ul className="meetup-card-menu__list" role="menu">
                  {options.map((option) => (
                    <li
                      key={option.id}
                      role="none"
                      className={option.dividerBefore ? 'meetup-card-menu__divider' : undefined}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={`meetup-card-menu__item${option.danger ? ' meetup-card-menu__item--danger' : ''}`}
                        onClick={option.onClick}
                      >
                        {option.icon}
                        <span className="meetup-card-menu__label">{option.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </AppOverlay>
  );
}
