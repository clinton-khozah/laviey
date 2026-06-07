import './FeedState.css';

interface FeedStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function FeedState({ message, onRetry, retryLabel = 'Try again' }: FeedStateProps) {
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
