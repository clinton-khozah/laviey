import type { ReactNode } from 'react';
import { SignInRequiredPrompt } from '@/components/auth/SignInRequiredPrompt';
import { isSignInRequiredMessage } from '@/utils/errors/userFacingErrorMessage';
import './FeedState.css';

interface FeedStateProps {
  message: string;
  illustration?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}

export function FeedState({
  message,
  illustration,
  onRetry,
  retryLabel = 'Try again',
}: FeedStateProps) {
  if (isSignInRequiredMessage(message)) {
    return <SignInRequiredPrompt message={message} onBeforeSignIn={onRetry} className="feed-state__sign-in" />;
  }

  return (
    <div className="feed-state" role="status">
      {illustration && (
        <div className="feed-state__illustration" aria-hidden>
          {illustration}
        </div>
      )}
      <p className="feed-state__message">{message}</p>
      {onRetry && (
        <button type="button" className="feed-state__retry" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
