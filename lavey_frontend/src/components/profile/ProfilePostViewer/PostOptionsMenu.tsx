import { useEffect, type ReactNode } from 'react';
import './PostOptionsMenu.css';

export type PostMenuAction = 'save' | 'hide' | 'onlyMe' | 'copyLink' | 'delete';

interface PostOptionsMenuProps {
  open: boolean;
  postType: 'video' | 'image';
  onClose: () => void;
  onAction: (action: PostMenuAction) => void | Promise<void>;
}

interface MenuItem {
  id: PostMenuAction;
  label: string;
  icon: ReactNode;
  danger?: boolean;
}

function IconSave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'save', label: 'Save to device', icon: <IconSave /> },
  { id: 'hide', label: 'Hide from profile', icon: <IconEyeOff /> },
  { id: 'onlyMe', label: 'Only me', icon: <IconLock /> },
  { id: 'copyLink', label: 'Copy link', icon: <IconLink /> },
  { id: 'delete', label: 'Delete post', icon: <IconTrash />, danger: true },
];

export function PostOptionsMenu({ open, postType, onClose, onAction }: PostOptionsMenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handlePick = (action: PostMenuAction) => {
    void Promise.resolve(onAction(action));
  };

  return (
    <>
      <button
        type="button"
        className="post-options-menu__backdrop"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className="post-options-menu post-options-menu--anchored" role="menu" aria-label="Post options">
        <ul className="post-options-menu__list">
          {MENU_ITEMS.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={`post-options-menu__item ${item.danger ? 'post-options-menu__item--danger' : ''}`}
                onClick={() => handlePick(item.id)}
              >
                <span className="post-options-menu__icon">{item.icon}</span>
                <span className="post-options-menu__label">
                  {item.id === 'save' && postType === 'video' ? 'Save video' : item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
