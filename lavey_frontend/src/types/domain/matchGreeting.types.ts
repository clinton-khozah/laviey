export interface MatchGreetingRequest {
  participantName: string;
  bio?: string;
  interests?: string[];
}

export interface MatchGreetingResult {
  suggestions: string[];
}
