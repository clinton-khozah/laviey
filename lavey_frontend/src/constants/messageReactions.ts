export const MESSAGE_REACTION_EMOJIS = ['❤️', '😂', '🔥', '👍', '😮', '😢'] as const;

export type MessageReactionEmoji = (typeof MESSAGE_REACTION_EMOJIS)[number];
