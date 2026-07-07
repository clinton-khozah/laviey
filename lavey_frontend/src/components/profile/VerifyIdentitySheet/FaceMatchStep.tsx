import { useEffect, useRef } from 'react';
import { LogoLoader } from '@/components/ui/LogoLoader';
import {
  compareFacePhotos,
  faceMatchUserMessage,
  type FaceCompareResult,
} from '@/utils/face/faceMatcher';

interface FaceMatchStepProps {
  referenceUrl: string;
  liveUrl: string;
  onMatch: (result: FaceCompareResult) => void;
  onFail: (message: string, result: FaceCompareResult | null) => void;
}

export function FaceMatchStep({ referenceUrl, liveUrl, onMatch, onFail }: FaceMatchStepProps) {
  const onMatchRef = useRef(onMatch);
  const onFailRef = useRef(onFail);
  onMatchRef.current = onMatch;
  onFailRef.current = onFail;

  useEffect(() => {
    let cancelled = false;

    async function runMatch() {
      try {
        await new Promise((r) => window.setTimeout(r, 120));
        if (cancelled) return;

        const result = await compareFacePhotos(referenceUrl, liveUrl);
        if (cancelled) return;

        if (result.match) {
          onMatchRef.current(result);
        } else {
          onFailRef.current(
            `Faces didn't match closely enough (${result.confidencePercent}% confidence). Try again with better lighting and a front-facing pose.`,
            result,
          );
        }
      } catch (error) {
        if (!cancelled) onFailRef.current(faceMatchUserMessage(error), null);
      }
    }

    void runMatch();

    return () => {
      cancelled = true;
    };
  }, [referenceUrl, liveUrl]);

  return (
    <div className="verify-face-match">
      <LogoLoader size="md" label="Verifying faces" />
      <p className="verify-face-match__hint">
        This usually takes about 5 minutes. We&apos;ll close this and notify you when it&apos;s done. This runs on your device — photos aren&apos;t sent for matching.
      </p>
    </div>
  );
}
