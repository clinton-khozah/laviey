import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MEETING_REACTION_EMOJI,
  type MeetingReactionBurst,
} from '@/constants/meeting/meetingReactions';
import './MeetingReactionOverlay.css';

interface MeetingReactionOverlayProps {
  bursts: MeetingReactionBurst[];
}

interface BurstMotion {
  xOffset: number;
  drift: number;
  size: number;
}

function burstMotion(id: string): BurstMotion {
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    xOffset: (hash % 7) * 5 - 15,
    drift: (hash % 2 === 0 ? 1 : -1) * (10 + (hash % 14)),
    size: 28 + (hash % 3) * 6,
  };
}

export function MeetingReactionOverlay({ bursts }: MeetingReactionOverlayProps) {
  const motionById = useMemo(() => {
    const map = new Map<string, BurstMotion>();
    for (const burst of bursts) {
      map.set(burst.id, burstMotion(burst.id));
    }
    return map;
  }, [bursts]);

  return (
    <div className="meeting-reaction-overlay" aria-live="polite">
      <AnimatePresence>
        {bursts.map((burst) => {
          const burstStyle = motionById.get(burst.id) ?? burstMotion(burst.id);
          return (
            <motion.div
              key={burst.id}
              className={`meeting-reaction-overlay__burst ${burst.isLocal ? 'meeting-reaction-overlay__burst--local' : ''}`}
              style={{ fontSize: burstStyle.size }}
              initial={{ opacity: 0, y: 8, x: burstStyle.xOffset, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 1, 0.85, 0],
                y: [8, -48, -140, -260, -360],
                x: [
                  burstStyle.xOffset,
                  burstStyle.xOffset - burstStyle.drift * 0.25,
                  burstStyle.xOffset + burstStyle.drift * 0.35,
                  burstStyle.xOffset - burstStyle.drift * 0.15,
                  burstStyle.xOffset + burstStyle.drift * 0.1,
                ],
                scale: [0.4, 1.05, 1, 0.96, 0.88],
                rotate: [0, -10, 8, -4, 0],
              }}
              exit={{ opacity: 0, y: -380, scale: 0.75 }}
              transition={{ duration: 2.8, ease: 'easeOut', times: [0, 0.12, 0.45, 0.78, 1] }}
            >
              <span className="meeting-reaction-overlay__emoji" aria-hidden>
                {MEETING_REACTION_EMOJI[burst.type]}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
