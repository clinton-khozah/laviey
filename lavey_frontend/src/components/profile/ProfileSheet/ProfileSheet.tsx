import { useEffect, type ReactNode, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppOverlay } from '@/components/ui/AppOverlay';
import { useAnchorPosition } from '@/hooks/ui/useAnchorPosition';
import './ProfileSheet.css';

interface ProfileSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Hide the drag handle bar at the top of the sheet */
  hideHandle?: boolean;
  /** Shorter sheet with tighter header/body padding */
  compact?: boolean;
  /** Extra-compact layout for the profile menu list */
  menu?: boolean;
  /** Compact edit-profile form */
  edit?: boolean;
  /** Anchor below a top-corner trigger (popover style) */
  anchored?: boolean;
  anchorRef?: RefObject<HTMLElement | null>;
  /** Centered modal on screen */
  centered?: boolean;
  /** Slightly smaller centered modal (profile menu sheets) */
  centeredSm?: boolean;
  /** Full-height sheet anchored to the top (slides down) */
  fromTop?: boolean;
  /** Extra control in the header (e.g. ⋮ menu), placed before close */
  headerAction?: ReactNode;
}

export function ProfileSheet({
  open,
  title,
  onClose,
  children,
  hideHandle,
  compact,
  menu,
  edit,
  anchored,
  anchorRef,
  centered,
  centeredSm,
  fromTop,
  headerAction,
}: ProfileSheetProps) {
  const anchorPos = useAnchorPosition(Boolean(open && anchored), anchorRef);
  const isPopover = anchored && !centered;
  const isFromTop = Boolean(fromTop);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const sheetClassName = [
    'profile-sheet',
    compact ? 'profile-sheet--compact' : '',
    menu ? 'profile-sheet--menu' : '',
    edit ? 'profile-sheet--edit' : '',
    isPopover ? 'profile-sheet--anchored' : '',
    centered ? 'profile-sheet--centered' : '',
    centered && centeredSm ? 'profile-sheet--centered-sm' : '',
    isFromTop ? 'profile-sheet--from-top' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const sheetContent = (
    <>
      <header className="profile-sheet__header">
        <h2 id="profile-sheet-title" className="profile-sheet__title">
          {title}
        </h2>
        <div className="profile-sheet__header-actions">
          {headerAction}
          <button type="button" className="profile-sheet__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </header>
      <div className="profile-sheet__body">{children}</div>
    </>
  );

  const motionInitial = centered
    ? { opacity: 0, scale: 0.94, y: 12 }
    : isPopover
      ? { opacity: 0, scale: 0.94, y: -6 }
      : isFromTop
        ? { y: '-100%' }
        : { y: '100%' };

  const motionAnimate =
    centered || isPopover ? { opacity: 1, scale: 1, y: 0 } : { y: 0 };

  const motionExit = centered
    ? { opacity: 0, scale: 0.96, y: 8 }
    : isPopover
      ? { opacity: 0, scale: 0.96, y: -4 }
      : isFromTop
        ? { y: '-100%' }
        : { y: '100%' };

  const motionTransition =
    centered || isPopover
      ? { type: 'spring' as const, stiffness: 420, damping: 32 }
      : { type: 'spring' as const, stiffness: 380, damping: 36 };

  return (
    <AppOverlay>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className={`profile-sheet__backdrop ${isPopover ? 'profile-sheet__backdrop--anchored' : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-label="Close"
            />
            {centered ? (
              <div className="profile-sheet__center" role="presentation">
                <motion.div
                  className={sheetClassName}
                  initial={motionInitial}
                  animate={motionAnimate}
                  exit={motionExit}
                  transition={motionTransition}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="profile-sheet-title"
                >
                  {sheetContent}
                </motion.div>
              </div>
            ) : (
              <motion.div
                className={sheetClassName}
                initial={motionInitial}
                animate={motionAnimate}
                exit={motionExit}
                transition={motionTransition}
                style={
                  isPopover
                    ? {
                        transformOrigin: 'top right',
                        top: anchorPos?.top ?? 'calc(var(--safe-top) + 44px)',
                        right: anchorPos?.right ?? 16,
                      }
                    : undefined
                }
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-sheet-title"
              >
                {!hideHandle && !isPopover && !isFromTop && (
                  <div className="profile-sheet__handle" aria-hidden />
                )}
                {sheetContent}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </AppOverlay>
  );
}
