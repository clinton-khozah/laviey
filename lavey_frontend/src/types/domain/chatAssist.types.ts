export interface ChatAssistMessage {
  sender: 'me' | 'them';
  text: string;
}

export interface ChatAssistResult {
  moodLabel: string;
  moodExplanation: string;
  suggestions: string[];
  source: 'ai' | 'fallback';
}
