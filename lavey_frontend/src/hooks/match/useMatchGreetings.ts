import { useEffect, useState } from 'react';
import { matchGreetingService } from '@/services/match/matchGreetingService';
import { localMatchGreetings } from '@/utils/match/localMatchGreetings';

export interface MatchGreetingContext {
  bio?: string;
  interests?: string[];
}

export function useMatchGreetings(
  participantName: string,
  enabled: boolean,
  context?: MatchGreetingContext,
): string[] {
  const [suggestions, setSuggestions] = useState(() => localMatchGreetings(participantName));

  useEffect(() => {
    if (!enabled) return;

    const name = participantName.trim() || 'there';
    setSuggestions(localMatchGreetings(name));

    let cancelled = false;

    void (async () => {
      const result = await matchGreetingService.getSuggestions({
        participantName: name,
        bio: context?.bio,
        interests: context?.interests,
      });
      if (!cancelled && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, participantName, context?.bio, context?.interests?.join('|')]);

  return suggestions;
}
