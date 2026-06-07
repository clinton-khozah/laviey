import { useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { legalService } from '@/services/legal/legalService';
import { TRUST_INFO, type TrustInfoContent, type TrustInfoVariant } from './trustInfoContent';
import './TrustInfoSheet.css';

interface TrustInfoSheetProps {
  open: boolean;
  variant: TrustInfoVariant;
  onClose: () => void;
}

export function TrustInfoSheet({ open, variant, onClose }: TrustInfoSheetProps) {
  const [content, setContent] = useState<TrustInfoContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setContent(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void legalService
      .getDocument(variant)
      .then((document) => {
        if (!cancelled) setContent(document);
      })
      .catch(() => {
        if (!cancelled) setContent(TRUST_INFO[variant]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, variant]);

  const sheetTitle = content?.title ?? TRUST_INFO[variant].title;

  return (
    <ProfileSheet open={open} title={sheetTitle} fromTop hideHandle onClose={onClose}>
      <div className="trust-info-sheet">
        {isLoading && !content ? (
          <div className="trust-info-sheet__loader">
            <PageTransitionSplash />
          </div>
        ) : content ? (
          <>
            <p className="trust-info-sheet__intro">{content.intro}</p>
            {content.safetyNote && (
              <div className="trust-info-sheet__safety" role="note">
                <span className="trust-info-sheet__safety-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <p>{content.safetyNote}</p>
              </div>
            )}
            {content.sections.map((section) => (
              <section key={section.title} className="trust-info-sheet__section">
                <h3 className="trust-info-sheet__section-title">{section.title}</h3>
                <ul className="trust-info-sheet__list">
                  {section.body.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            ))}
            {content.footer && <p className="trust-info-sheet__footer">{content.footer}</p>}
          </>
        ) : null}
      </div>
    </ProfileSheet>
  );
}
