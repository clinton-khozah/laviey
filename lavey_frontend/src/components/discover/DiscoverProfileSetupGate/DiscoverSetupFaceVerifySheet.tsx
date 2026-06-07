import { useCallback, useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { verificationService } from '@/services/verification/verificationService';
import { defaultAvatar } from '@/constants/defaultAvatar';
import { hasCustomProfileAvatar } from '@/utils/discover/discoverProfileReady';
import { LiveSelfieStep } from '@/components/profile/VerifyIdentitySheet/LiveSelfieStep';
import {
  compareFaceReferenceToLive,
  faceMatchUserMessage,
  type FaceCompareResult,
} from '@/utils/face/faceMatcher';
import { getUserFacingErrorMessage } from '@/utils/errors/userFacingErrorMessage';
import type { UserProfile } from '@/types';
import './DiscoverSetupSheets.css';

type VerifyStep = 'intro' | 'live' | 'matching' | 'fail';

interface DiscoverSetupFaceVerifySheetProps {
  open: boolean;
  profile: UserProfile;
  avatarPreview?: string;
  onClose: () => void;
  onVerified: () => void | Promise<void>;
}

export function DiscoverSetupFaceVerifySheet({
  open,
  profile,
  avatarPreview,
  onClose,
  onVerified,
}: DiscoverSetupFaceVerifySheetProps) {
  const [step, setStep] = useState<VerifyStep>('intro');
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<FaceCompareResult | null>(null);
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusText, setStatusText] = useState('Matching your live selfie…');

  const referenceUrl =
    (hasCustomProfileAvatar(avatarPreview) ? avatarPreview : undefined) ??
    (hasCustomProfileAvatar(profile.avatarUrl) ? profile.avatarUrl : undefined) ??
    defaultAvatar;

  const reset = useCallback(() => {
    setStep('intro');
    setLiveUrl(null);
    setMatchResult(null);
    setFailMessage(null);
    setIsSaving(false);
    setStatusText('Matching your live selfie…');
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const runMatch = async (nextLiveUrl: string) => {
    setStep('matching');
    setFailMessage(null);
    try {
      setStatusText('Matching your live selfie…');
      const result = await compareFaceReferenceToLive(referenceUrl, nextLiveUrl);
      if (!result.match) {
        setMatchResult(result);
        setFailMessage(
          `Faces didn't match closely enough (${result.confidencePercent}% confidence). Try again with better lighting.`,
        );
        setStep('fail');
        return;
      }

      setIsSaving(true);
      setStatusText('Saving verified status…');
      await verificationService.completeVerification();
      await onVerified();
      handleClose();
    } catch (error) {
      setFailMessage(faceMatchUserMessage(error));
      setStep('fail');
    } finally {
      setIsSaving(false);
    }
  };

  const title =
    step === 'live'
      ? 'Live selfie check'
      : step === 'matching'
        ? 'Verifying…'
        : step === 'fail'
          ? 'Verification failed'
          : 'Verify your face';

  return (
    <ProfileSheet
      open={open}
      title={title}
      onClose={handleClose}
      compact
      hideHandle
    >
      <div className="discover-setup-sheet discover-setup-sheet--verify">
        {step === 'intro' && (
          <>
            <p className="discover-setup-sheet__lead">
              Confirm the profile photo is really you. We&apos;ll compare it to a live camera check — photos on another phone won&apos;t work.
            </p>
            <div className="discover-setup-sheet__verify-ref">
              <img src={referenceUrl} alt="Your profile photo" />
              <span>Profile photo</span>
            </div>
            <button type="button" className="discover-setup-sheet__btn" onClick={() => setStep('live')}>
              Start live check
            </button>
          </>
        )}

        {step === 'live' && (
          <LiveSelfieStep
            onBack={() => setStep('intro')}
            onCapture={(url) => {
              setLiveUrl(url);
              void runMatch(url);
            }}
          />
        )}

        {step === 'matching' && (
          <div className="discover-setup-sheet__matching">
            <LogoLoader size="md" label="Verifying face" />
          </div>
        )}

        {step === 'fail' && (
          <>
            <p className="discover-setup-sheet__error">{failMessage ?? getUserFacingErrorMessage(null)}</p>
            {matchResult && (
              <p className="discover-setup-sheet__match-score">
                Match confidence: {matchResult.confidencePercent}%
              </p>
            )}
            {liveUrl && (
              <div className="discover-setup-sheet__verify-ref">
                <img src={liveUrl} alt="Live attempt" />
                <span>Live attempt</span>
              </div>
            )}
            <button type="button" className="discover-setup-sheet__btn" onClick={() => setStep('live')}>
              Try live check again
            </button>
            <button
              type="button"
              className="discover-setup-sheet__btn discover-setup-sheet__btn--secondary"
              onClick={() => setStep('intro')}
            >
              Back
            </button>
          </>
        )}
      </div>
    </ProfileSheet>
  );
}
