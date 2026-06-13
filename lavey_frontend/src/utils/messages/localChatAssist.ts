import type { ChatAssistMessage, ChatAssistResult } from '@/types/domain/chatAssist.types';

function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'They';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function lastTheirMessage(messages: ChatAssistMessage[]): ChatAssistMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.sender === 'them') return messages[i];
  }
  return undefined;
}

function buildReplySuggestions(lastText: string, name: string): string[] {
  const lower = lastText.toLowerCase();

  if (/how('re| are) you|how('s| is) (your )?(day|week|night|morning)|how have you been|how you doing|how u doing/i.test(lower)) {
    return [
      "I'm great, thanks! How's your day? 😊",
      'Feeling good — what about you? ✨',
      "Everything's awesome, how about you? 🔥",
    ];
  }

  if (/what('re| are) you up to|what you doing|whatcha doing|plans tonight|doing later/i.test(lower)) {
    return [
      'Just chilling — you? 😌',
      'Not much yet, might change that though 😉',
      'Relaxing — what are you getting into? ✨',
    ];
  }

  if (/^(hey|hi|hello|yo|sup|what's up|wassup)\b/i.test(lower.trim())) {
    return [
      `Hey ${name}! Good to hear from you 😊`,
      'Hi! How has your day been? ✨',
      'Hey you — what is the vibe today? 🔥',
    ];
  }

  if (lower.includes('?')) {
    return [
      "Good question — for me it's probably… 🤔",
      "Ha, I like that you asked. I'd say… 😊",
      `Honestly? Kind of the same vibe as you, ${name} ✨`,
    ];
  }

  if (/collab|weekend|meet|coffee|hang|date|room|vibe/i.test(lower)) {
    return [
      "I'm down — what day works for you? ☕",
      'That sounds fun. Want to pick a time? 😊',
      'Yes! Let us make it happen 🔥',
    ];
  }

  if (/hike|spot|photo|video|content|cute|fire|adorable|😍|🔥|❤️|💕/i.test(lower)) {
    return [
      'Thank you! That means a lot 😊',
      'Appreciate that — tell me more ✨',
      'You are sweet for saying that 🔥',
    ];
  }

  return [
    `That's sweet — ${name}, what got you into that? 😊`,
    'Ha, fair. What are you up to later? ✨',
    'Love that — what about you? 🔥',
  ];
}

export function localChatAssist(
  participantName: string,
  messages: ChatAssistMessage[],
): ChatAssistResult {
  const name = firstName(participantName);
  const lastThem = lastTheirMessage(messages);
  const lastText = lastThem?.text ?? '';
  const lower = lastText.toLowerCase();
  const questionCount = messages.filter((m) => m.sender === 'them' && m.text.includes('?')).length;

  let moodLabel = 'Getting to know you';
  let moodExplanation = `I think ${name} is still feeling you out — keep the energy warm and easy.`;

  if (questionCount >= 2 || (lower.includes('?') && lower.split('?').length > 2)) {
    moodLabel = 'Curious about you';
    moodExplanation = `I think ${name} wants to know you better — they keep asking questions and steering toward your interests. Match their curiosity with something personal back.`;
  } else if (/collab|weekend|meet|coffee|date|hang|room|vibe/i.test(lower)) {
    moodLabel = 'Ready to meet up';
    moodExplanation = `${name} seems interested in taking this offline or doing something together soon. They're testing whether you're open to plans.`;
  } else if (/love|cute|fire|adorable|😍|🔥|❤️|💕/i.test(lower)) {
    moodLabel = 'Flirty & upbeat';
    moodExplanation = `${name} is giving playful, compliment-heavy energy. They're comfortable and trying to keep the spark going.`;
  } else if (messages.filter((m) => m.sender === 'them').length >= 3 && !lower.includes('?')) {
    moodLabel = 'Comfortably engaged';
    moodExplanation = `The chat has a steady back-and-forth rhythm. ${name} seems invested — they're replying with substance, not just one-word answers.`;
  }

  return {
    moodLabel,
    moodExplanation,
    suggestions: buildReplySuggestions(lastText, name),
    source: 'fallback',
  };
}
