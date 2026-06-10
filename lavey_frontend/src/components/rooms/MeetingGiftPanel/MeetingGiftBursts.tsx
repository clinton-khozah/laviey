import { AnimatePresence, motion } from 'framer-motion';
import type { GiftBurst } from '@/hooks/gifts/useMeetingGift';
import './MeetingGiftBursts.css';

interface MeetingGiftBurstsProps {
  bursts: GiftBurst[];
}

export function MeetingGiftBursts({ bursts }: MeetingGiftBurstsProps) {
  return (
    <div className="meeting-gift-bursts" aria-hidden={bursts.length === 0}>
      <AnimatePresence>
        {bursts.map((burst, index) => (
          <motion.div
            key={burst.id}
            className="meeting-gift-bursts__item"
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -48 - index * 20, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 1.05 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <span className="meeting-gift-bursts__heart">♥</span>
            +${burst.amount}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
