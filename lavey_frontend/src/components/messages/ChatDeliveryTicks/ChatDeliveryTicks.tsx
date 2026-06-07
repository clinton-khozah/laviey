import './ChatDeliveryTicks.css';

interface ChatDeliveryTicksProps {
  /** Message was read by the other person */
  read: boolean;
  /** Other person is currently online (double tick when true) */
  recipientOnline: boolean;
}

function TickIcon({ second = false }: { second?: boolean }) {
  return (
    <svg viewBox="0 0 16 12" fill="none" aria-hidden className="chat-ticks__icon">
      <path
        d="M1 6.2L4.2 9.4L10.2 2.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {second ? (
        <path
          d="M5 6.2L8.2 9.4L14.2 2.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

export function ChatDeliveryTicks({ read, recipientOnline }: ChatDeliveryTicksProps) {
  const showDouble = recipientOnline || read;
  const variant = read ? 'read' : recipientOnline ? 'delivered' : 'sent';

  return (
    <span
      className={`chat-ticks chat-ticks--${variant}`}
      aria-label={
        read ? 'Read' : recipientOnline ? 'Delivered' : 'Sent'
      }
      title={read ? 'Read' : recipientOnline ? 'Delivered' : 'Sent'}
    >
      <TickIcon second={showDouble} />
    </span>
  );
}
