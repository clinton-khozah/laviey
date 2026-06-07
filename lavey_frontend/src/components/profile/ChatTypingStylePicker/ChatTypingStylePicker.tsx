import { CHAT_TYPING_STYLE_OPTIONS, type ChatTypingStyle } from '@/types/domain/chatTypingStyle.types';
import './ChatTypingStylePicker.css';

interface ChatTypingStylePickerProps {
  value: ChatTypingStyle;
  onChange: (style: ChatTypingStyle) => void;
}

export function ChatTypingStylePicker({ value, onChange }: ChatTypingStylePickerProps) {
  return (
    <div className="chat-typing-style-picker">
      <span className="chat-typing-style-picker__label">Chat text style</span>
      <p className="chat-typing-style-picker__hint">
        How your sent messages, typing line, and message box look in every chat.
      </p>
      <div className="chat-typing-style-picker__options" role="group" aria-label="Chat text style">
        {CHAT_TYPING_STYLE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chat-typing-style-picker__option ${value === option.id ? 'chat-typing-style-picker__option--active' : ''}`}
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
          >
            <span
              className={`chat-typing-style-picker__preview chat-typing-style-picker__preview--${option.id}`}
              data-chat-typing-style={option.id}
              aria-hidden
            >
              <span className={`chat-typing-style-picker__preview-msg chat-typing-style-picker__preview-msg--${option.id}`}>
                Hey, thinking of you ✨
              </span>
              <span className="chat-typing-style-picker__preview-typing">writing to you…</span>
              <span className="chat-typing-style-picker__preview-input">Say something sweet…</span>
            </span>
            <span className="chat-typing-style-picker__name">{option.label}</span>
            <span className="chat-typing-style-picker__desc">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
