import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { getSheetSaveCopy, type SheetSaveAction } from './sheetSaveMessages';
import './SheetSaveSuccess.css';

interface SheetSaveSuccessProps {
  action: SheetSaveAction;
  detail?: string;
  onComplete?: () => void;
  autoCloseMs?: number;
  variant?: 'replace' | 'overlay';
}

export function SheetSaveSuccess({
  action,
  detail,
  onComplete,
  autoCloseMs = 2400,
  variant = 'replace',
}: SheetSaveSuccessProps) {
  const copy = getSheetSaveCopy(action, detail);

  useEffect(() => {
    if (!onComplete) return;
    const timer = window.setTimeout(onComplete, autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [action, autoCloseMs, onComplete]);

  return (
    <motion.div
      className={`sheet-save-success sheet-save-success--${variant}`}
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, scale: 0.96, y: variant === 'overlay' ? 8 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
    >
      <div className="sheet-save-success__icon-wrap" aria-hidden>
        <motion.span
          className="sheet-save-success__ring"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
        />
        <motion.span
          className="sheet-save-success__icon"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.1 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <motion.path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.2, ease: 'easeOut' }}
            />
          </svg>
        </motion.span>
      </div>

      <h3 className="sheet-save-success__title">{copy.title}</h3>
      <p className="sheet-save-success__message">{copy.message}</p>

      {onComplete && (
        <button type="button" className="sheet-save-success__done" onClick={onComplete}>
          Done
        </button>
      )}
    </motion.div>
  );
}
