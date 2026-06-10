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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
