import { useEffect, useState } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { APP_IMAGES } from '@/constants/images';
import './ChatPhotoViewer.css';

interface ChatPhotoViewerProps {
  open: boolean;
  imageUrl: string;
  isOwn?: boolean;
  expiresLabel?: string | null;
  onClose: () => void;
  onRequestDelete?: () => void;
}

export function ChatPhotoViewer({
  open,
  imageUrl,
  isOwn = false,
  expiresLabel,
  onClose,
  onRequestDelete,
}: ChatPhotoViewerProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setMenuOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (menuOpen) {
          setMenuOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, menuOpen, onClose]);

  const handleDelete = () => {
    setMenuOpen(false);
    onClose();
    onRequestDelete?.();
  };

  if (!open) return null;

  return (
    <AppOverlay>
      <div
        className={`chat-photo-viewer ${isOwn ? 'chat-photo-viewer--own' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Photo preview"
      >
        <div className="chat-photo-viewer__top">
          <button
            type="button"
            className="chat-photo-viewer__icon-btn"
            onClick={onClose}
            aria-label="Close photo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {expiresLabel ? (
            <span className="chat-photo-viewer__ttl">{expiresLabel}</span>
          ) : (
            <span className="chat-photo-viewer__ttl chat-photo-viewer__ttl--spacer" aria-hidden />
          )}

          <div className="chat-photo-viewer__menu-anchor">
            {onRequestDelete ? (
              <>
                <button
                  type="button"
                  className={`chat-photo-viewer__icon-btn ${menuOpen ? 'chat-photo-viewer__icon-btn--active' : ''}`}
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-label="Photo options"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <circle cx="12" cy="5" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="12" cy="19" r="1.75" />
                  </svg>
                </button>

                {menuOpen ? (
                  <>
                    <button
                      type="button"
                      className="chat-photo-viewer__menu-backdrop"
                      onClick={() => setMenuOpen(false)}
                      aria-label="Close menu"
                    />
                    <div className="chat-photo-viewer__menu" role="menu">
                      <button
                        type="button"
                        className="chat-photo-viewer__menu-item chat-photo-viewer__menu-item--danger"
                        role="menuitem"
                        onClick={handleDelete}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                        </svg>
                        Delete photo
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <span className="chat-photo-viewer__icon-btn chat-photo-viewer__icon-btn--spacer" aria-hidden />
            )}
          </div>
        </div>

        <div className="chat-photo-viewer__stage" onClick={onClose}>
          <div
            className="chat-photo-viewer__frame"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <img src={imageUrl} alt="" draggable={false} className="chat-photo-viewer__img" />
            <div className="chat-photo-viewer__shield" aria-hidden>
              <img src={APP_IMAGES.logo} alt="" className="chat-photo-viewer__watermark" />
            </div>
          </div>
        </div>
      </div>
    </AppOverlay>
  );
}
