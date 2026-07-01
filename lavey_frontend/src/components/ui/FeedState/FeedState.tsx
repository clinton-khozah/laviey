import { SignInRequiredPrompt } from '@/components/auth/SignInRequiredPrompt';
import { isSignInRequiredMessage } from '@/utils/errors/userFacingErrorMessage';
import './FeedState.css';

interface FeedStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function FeedState({ message, onRetry, retryLabel = 'Try again' }: FeedStateProps) {
  if (isSignInRequiredMessage(message)) {
    return <SignInRequiredPrompt message={message} onBeforeSignIn={onRetry} className="feed-state__sign-in" />;
  }

  return (
    <div className="feed-state" role="status">
      <p className="feed-state__message">{message}</p>
      {onRetry && (
        <button type="button" className="feed-state__retry" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
