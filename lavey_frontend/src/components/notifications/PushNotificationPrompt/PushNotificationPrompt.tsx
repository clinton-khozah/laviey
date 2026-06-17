import { ProfileSheet } from '@/components/profile/ProfileSheet';
import '@/components/rooms/meetupTopSheet.css';
import './PushNotificationPrompt.css';

interface PushNotificationPromptProps {
  open: boolean;
  isEnabling: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export function PushNotificationPrompt({
  open,
  isEnabling,
  onEnable,
  onDismiss,
}: PushNotificationPromptProps) {
  return (
    <ProfileSheet
      open={open}
      title="Notifications"
      fromTop
      compact
      hideHandle
      onClose={onDismiss}
    >
      <div className="meetup-top-sheet push-prompt-sheet">
        <div className="push-prompt-sheet__hero">
          <span className="push-prompt-sheet__icon" aria-hidden>
            🔔
          </span>
          <div className="push-prompt-sheet__copy">
            <p className="push-prompt-sheet__title">
              Get alerts when someone likes you or joins your meetup
            </p>
            <p className="push-prompt-sheet__body">
              Turn on notifications so you see likes and meetup activity even when Lavey is closed.
              On iPhone, add Lavey to your Home Screen for the best results.
            </p>
          </div>
        </div>

        <div className="push-prompt-sheet__actions">
          <button
            type="button"
            className="push-prompt-sheet__btn push-prompt-sheet__btn--ghost"
            onClick={onDismiss}
            disabled={isEnabling}
          >
            Not now
          </button>
          <button
            type="button"
            className="push-prompt-sheet__btn push-prompt-sheet__btn--primary"
            onClick={onEnable}
            disabled={isEnabling}
          >
            {isEnabling ? 'Turning on…' : 'Allow notifications'}
          </button>
        </div>
      </div>
    </ProfileSheet>
  );
}
