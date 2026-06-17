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
      <span className="crushy-kiss-icon__emoji">💋</span>
    </span>
  );
}
