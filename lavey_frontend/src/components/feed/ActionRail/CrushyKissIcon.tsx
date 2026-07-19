import { motion } from 'framer-motion';
import './CrushyKissIcon.css';

interface CrushyKissIconProps {
  active?: boolean;
  pending?: boolean;
  className?: string;
}

/** Lipstick kiss mark — 💋 crushy icon on the For You feed. */
export function CrushyKissIcon({
  active = false,
  pending = false,
  className = '',
}: CrushyKissIconProps) {
  return (
    <span
      className={[
        'crushy-kiss-icon',
        active ? 'crushy-kiss-icon--active' : '',
        pending ? 'crushy-kiss-icon--pending' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <motion.span
        className="crushy-kiss-icon__emoji"
        animate={active ? { scale: [1, 1.32, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        💋
      </motion.span>
    </span>
  );
}
