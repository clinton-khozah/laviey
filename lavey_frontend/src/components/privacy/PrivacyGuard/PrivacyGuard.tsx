import type { ReactNode } from 'react';
import { usePrivacyProtection } from '@/hooks/privacy/usePrivacyProtection';
import './PrivacyGuard.css';

interface PrivacyGuardProps {
  children: ReactNode;
}

export function PrivacyGuard({ children }: PrivacyGuardProps) {
  const { contentShielded, warnVisible } = usePrivacyProtection();

  return (
    <div
      className={`privacy-guard ${contentShielded ? 'privacy-guard--shielded' : ''}`}
      data-privacy-shield={contentShielded ? 'on' : 'off'}
    >
      <div className="privacy-guard__content">{children}</div>

      {contentShielded && (
        <div className="privacy-guard__shield" role="presentation" aria-hidden>
          <div className="privacy-guard__shield-inner">
            <span className="privacy-guard__shield-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <p className="privacy-guard__shield-title">Content hidden</p>
            <p className="privacy-guard__shield-text">For everyone&apos;s privacy</p>
          </div>
        </div>
      )}

      {warnVisible && (
        <div className="privacy-guard__warn" role="alert" aria-live="assertive">
          <span className="privacy-guard__warn-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
              <path d="M2 2l20 20" />
            </svg>
          </span>
          Screenshots are disabled to protect privacy
        </div>
      )}
    </div>
  );
}
