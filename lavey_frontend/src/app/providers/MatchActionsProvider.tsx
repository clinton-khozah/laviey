import { createContext, useContext, type ReactNode } from 'react';
import {
  useMatchActionsState,
  type UseMatchActionsResult,
} from '@/hooks/match/useMatchActionsState';

const MatchActionsContext = createContext<UseMatchActionsResult | null>(null);

export function MatchActionsProvider({ children }: { children: ReactNode }) {
  const value = useMatchActionsState();
  return (
    <MatchActionsContext.Provider value={value}>{children}</MatchActionsContext.Provider>
  );
}

export function useMatchActions(): UseMatchActionsResult {
  const ctx = useContext(MatchActionsContext);
  if (!ctx) {
    throw new Error('useMatchActions must be used within MatchActionsProvider');
  }
  return ctx;
}
