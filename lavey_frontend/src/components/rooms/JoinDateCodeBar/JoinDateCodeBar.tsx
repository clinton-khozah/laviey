import { useState } from 'react';
import './JoinDateCodeBar.css';

interface JoinDateCodeBarProps {
  isJoining: boolean;
  error?: string | null;
  onJoin: (code: string) => void;
}

export function JoinDateCodeBar({ isJoining, error, onJoin }: JoinDateCodeBarProps) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onJoin(code.trim());
  };

  return (
    <form className="join-code-bar" onSubmit={handleSubmit}>
      <div className="join-code-bar__icon" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 7h2a2 2 0 012 2v8a2 2 0 01-2 2h-2M9 17H7a2 2 0 01-2-2V9a2 2 0 012-2h2M12 11v2M8 11v2M16 11v2" />
        </svg>
      </div>
      <input
        type="text"
        className="join-code-bar__input"
        placeholder="Enter meetup code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-label="Meetup access code"
      />
      <button type="submit" className="join-code-bar__btn" disabled={isJoining || !code.trim()}>
        {isJoining ? '…' : 'Join'}
      </button>
      {error && <p className="join-code-bar__error">{error}</p>}
    </form>
  );
}
