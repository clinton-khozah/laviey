export type ChatTypingStyle = 'romantic' | 'classic' | 'neon' | 'minimal';

export const DEFAULT_CHAT_TYPING_STYLE: ChatTypingStyle = 'romantic';

export const CHAT_TYPING_STYLE_OPTIONS: {
  id: ChatTypingStyle;
  label: string;
  description: string;
}[] = [
  { id: 'romantic', label: 'Romantic', description: 'Serif messages, rose typing & input' },
  { id: 'classic', label: 'Classic', description: 'Standard bubbles, clean & readable' },
  { id: 'neon', label: 'Neon', description: 'Glowing messages & bold accents' },
  { id: 'minimal', label: 'Minimal', description: 'Quiet text, simple bubbles' },
];
