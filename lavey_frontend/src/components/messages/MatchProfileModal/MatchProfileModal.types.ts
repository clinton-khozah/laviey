import type { Conversation, Profile } from '@/types';

export type MatchProfileModalMode = 'discover' | 'messages';

export interface MatchProfileModalProps {
  open: boolean;
  mode: MatchProfileModalMode;
  profile: Profile | null;
  conversation?: Conversation | null;
  liked?: boolean;
  likedYou?: boolean;
  isLoading: boolean;
  isSubmittingFlame?: boolean;
  onClose: () => void;
  onMessage?: () => void;
  /**
   * Used in `mode="messages"` to send a greeting automatically
   * (e.g. "Hi {name} 👋") from the match popup.
   */
  onSendMessage?: (text: string) => void;
  onFlame?: () => void;
}
