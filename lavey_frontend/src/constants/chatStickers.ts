/** Stickers users can send in chat (no file attachments). */
export const CHAT_STICKERS = [
  '❤️',
  '🔥',
  '✨',
  '💫',
  '😍',
  '🥰',
  '😘',
  '💋',
  '🌹',
  '💜',
  '😂',
  '🤣',
  '😊',
  '😎',
  '🤩',
  '🥳',
  '👋',
  '🙌',
  '💪',
  '☕',
  '🎉',
  '🎵',
  '💃',
  '🦋',
  '🌙',
  '⭐',
  '💖',
  '🫶',
  '👀',
  '💯',
] as const;

export type ChatSticker = (typeof CHAT_STICKERS)[number];

const STICKER_SET = new Set<string>(CHAT_STICKERS);

export function isChatStickerMessage(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && STICKER_SET.has(trimmed);
}
