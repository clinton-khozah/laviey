import { useEffect, useState } from 'react';
import type { DiscoverFeedAlgorithm, ForYouTasteInsight } from '@/types/discoverIntelligence';
import { shouldShowForYouIntelligenceBanner } from '@/types/discoverIntelligence';
import './ForYouIntelligenceBanner.css';

export interface ForYouIntelligenceBannerProps {
  algorithm: DiscoverFeedAlgorithm | null;
  tasteInsight: ForYouTasteInsight | null;
  visible?: boolean;
}

const ALGO_ICONS: Record<string, string> = {
  'swipe-index': '✨',
  'affinity-proximity': '🎯',
  'engagement-ai': '💫',
};

export function ForYouIntelligenceBanner({
  algorithm,
  tasteInsight,
  visible = true,
}: ForYouIntelligenceBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setDismissed(false);
    setExpanded(true);
  }, [algorithm?.slug, tasteInsight?.likeCount, tasteInsight?.confidence]);

  useEffect(() => {
    if (!visible || dismissed) return;
    const timer = window.setTimeout(() => setExpanded(false), 6500);
    return () => window.clearTimeout(timer);
  }, [visible, dismissed, algorithm?.slug, tasteInsight?.likeCount]);

  if (!visible || dismissed || !shouldShowForYouIntelligenceBanner(tasteInsight) || !tasteInsight) {
    return null;
  }

  const icon = ALGO_ICONS[algorithm?.slug ?? tasteInsight.algorithmSlug ?? ''] ?? '🔥';

  return (
    <div
      className={`for-you-intelligence ${expanded ? 'for-you-intelligence--expanded' : ''}`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="for-you-intelligence__main"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className="for-you-intelligence__pulse" aria-hidden />
        <span className="for-you-intelligence__icon" aria-hidden>
          {icon}
        </span>
        <span className="for-you-intelligence__copy">
          <span className="for-you-intelligence__headline">{tasteInsight.headline}</span>
          <span className="for-you-intelligence__subtitle">{tasteInsight.subtitle}</span>
        </span>
      </button>

      {expanded ? (
        <div className="for-you-intelligence__chips">
          {tasteInsight.signals.map((signal) => (
            <span key={signal} className="for-you-intelligence__chip">
              {signal}
            </span>
          ))}
          {tasteInsight.likeCount >= 3 ? (
            <span className="for-you-intelligence__chip for-you-intelligence__chip--meta">
              {tasteInsight.likeCount} likes learned
            </span>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="for-you-intelligence__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss For You intelligence"
      >
        ×
      </button>
    </div>
  );
}
