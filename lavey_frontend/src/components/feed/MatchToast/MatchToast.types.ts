import type { MatchToastProfile } from '@/types';

export interface MatchToastProps {
  match: MatchToastProfile | null;
  onClose: () => void;
  onSendGreeting: (text: string) => void;
}
