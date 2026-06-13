/** First name for natural mood copy — avoids full-name repetition in AI text. */
export function chatAssistFirstName(participantName: string): string {
  const trimmed = participantName.trim();
  if (!trimmed) return 'They';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

const GREETING_PATTERN = /\b(hey|hi|hello|yo|sup|hiya|heya|dear)\s+([A-Za-z][A-Za-z'-]*)\b/gi;
const LEADING_NAME_PATTERN = /^([A-Za-z][A-Za-z'-]*)(\s*,\s*)/;

function isCommonLeadingWord(word: string): boolean {
  return /^(good|great|thanks|thank|yes|yeah|yep|just|feeling|everything|hope|nice|wow|lol|ha|ok|okay|well|so|the|a|an|not|all|hi|hey)$/i.test(
    word,
  );
}

/** Keep reply suggestions using the match's real first name, not chat nicknames. */
export function polishSuggestions(suggestions: string[], participantName: string): string[] {
  const first = chatAssistFirstName(participantName);
  if (!first || first === 'They') return suggestions;

  return suggestions.map((raw) => {
    let text = raw.replace(/\s+/g, ' ').trim();

    text = text.replace(GREETING_PATTERN, (full, greeting, name) => {
      if (name.toLowerCase() === first.toLowerCase()) return full;
      const g = greeting.charAt(0).toUpperCase() + greeting.slice(1).toLowerCase();
      return `${g} ${first}`;
    });

    text = text.replace(LEADING_NAME_PATTERN, (full, name, punct) => {
      if (name.toLowerCase() === first.toLowerCase()) return full;
      if (isCommonLeadingWord(name)) return full;
      return `${first}${punct}`;
    });

    return text;
  });
}

/**
 * Normalize mood explanation without stripping a leading first name.
 * e.g. "Keatlegile uses playful nicknames…" → "I think Keatlegile uses playful nicknames…"
 */
export function polishMoodExplanation(raw: string, participantName: string): string {
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return text;

  const first = chatAssistFirstName(participantName);
  const full = participantName.trim();

  text = text.replace(/^i think\s+/i, '');

  if (full && text.toLowerCase().startsWith(full.toLowerCase())) {
    text = text.slice(full.length).trim().replace(/^i think\s+/i, '');
    if (/^(uses|use|seems|seem|wants|want|is|are|has|have)\b/i.test(text)) {
      text = `${first} ${text}`;
    }
  }

  text = text.replace(/^i think\s+/i, '').replace(/^[,.–—-]+\s*/, '');

  if (text.toLowerCase().startsWith(first.toLowerCase())) {
    const withName = text.charAt(0).toUpperCase() + text.slice(1);
    return /^i think\b/i.test(withName) ? withName : `I think ${withName.charAt(0).toLowerCase()}${withName.slice(1)}`;
  }

  text = text
    .replace(/^they want\b/i, `${first} wants`)
    .replace(/^they seem\b/i, `${first} seems`)
    .replace(/^they are\b/i, `${first} is`)
    .replace(/^they're\b/i, `${first} is`)
    .replace(/^they use\b/i, `${first} uses`)
    .replace(/^he wants\b/i, `${first} wants`)
    .replace(/^he seems\b/i, `${first} seems`)
    .replace(/^she wants\b/i, `${first} wants`)
    .replace(/^she seems\b/i, `${first} seems`);

  if (/^i think\b/i.test(text)) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return `I think ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}
