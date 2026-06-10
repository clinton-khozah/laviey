import { AnimatePresence, motion } from 'framer-motion';
import {
  MEETING_REACTION_EMOJI,
  type MeetingReactionBurst,
} from '@/constants/meeting/meetingReactions';
import './MeetingReactionOverlay.css';

interface MeetingReactionOverlayProps {
  bursts: MeetingReactionBurst[];
}

export function MeetingReactionOverlay({ bursts }: MeetingReactionOverlayProps) {
  return (
    <div className="meeting-reaction-overlay" aria-live="polite">
      <AnimatePresence>
        {bursts.map((burst, index) => (
          <motion.div
            key={burst.id}
            className={`meeting-reaction-overlay__burst ${burst.isLocal ? 'meeting-reaction-overlay__burst--local' : ''}`}
            initial={{ opacity: 0, y: 24, scale: 0.6 }}
            animate={{
              opacity: 1,
              y: -72 - (index % 4) * 28,
              x: (index % 3 - 1) * 36,
              scale: 1,
            }}
            exit={{ opacity: 0, y: -120, scale: 1.15 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <span className="meeting-reaction-overlay__emoji" aria-hidden>
              {MEETING_REACTION_EMOJI[burst.type]}
            </span>
            {!burst.isLocal && (
              <span className="meeting-reaction-overlay__name">{burst.fromName.split(' ')[0]}</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
