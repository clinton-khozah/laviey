import { useCallback, useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { LogoLoader } from '@/components/ui/LogoLoader';
import { verificationService } from '@/services/verification/verificationService';
import { defaultAvatar } from '@/constants/defaultAvatar';
import { hasCustomProfileAvatar } from '@/utils/discover/discoverProfileReady';
import { LiveSelfieStep } from '@/components/profile/VerifyIdentitySheet/LiveSelfieStep';
import { getUserFacingErrorMessage } from '@/utils/errors/userFacingErrorMessage';
import type { UserProfile } from '@/types';
import './DiscoverSetupSheets.css';

type VerifyStep = 'intro' | 'live' | 'submitting' | 'done';

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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const referenceUrl =
    (hasCustomProfileAvatar(avatarPreview) ? avatarPreview : undefined) ??
    (hasCustomProfileAvatar(profile.avatarUrl) ? profile.avatarUrl : undefined) ??
    defaultAvatar;

  const reset = useCallback(() => {
    setStep('intro');
    setSubmitError(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitForReview = async (nextLiveUrl: string) => {
    setStep('submitting');
    setSubmitError(null);
    try {
      await verificationService.submitForManualReview(referenceUrl, nextLiveUrl);
      setStep('done');
      await onVerified();
    } catch (error) {
      setSubmitError(getUserFacingErrorMessage(error, 'Could not submit verification.'));
      setStep('live');
    }
  };

  const title =
    step === 'live'
      ? 'Live selfie'
      : step === 'submitting'
        ? 'Submitting…'
        : step === 'done'
          ? 'Request sent'
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
              Take a live selfie with your profile photo. Our team will review your request and
              we&apos;ll notify you in the app when you&apos;re verified.
            </p>
            <div className="discover-setup-sheet__verify-ref">
              <img src={referenceUrl} alt="Your profile photo" />
              <span>Profile photo</span>
            </div>
            <button type="button" className="discover-setup-sheet__btn" onClick={() => setStep('live')}>
              Continue
            </button>
          </>
        )}

        {step === 'live' && (
          <>
            <LiveSelfieStep
              onBack={() => setStep('intro')}
              onCapture={(url) => {
                void submitForReview(url);
              }}
            />
            {submitError ? <p className="discover-setup-sheet__error">{submitError}</p> : null}
          </>
        )}

        {step === 'submitting' && (
          <div className="discover-setup-sheet__matching">
            <LogoLoader size="md" label="Sending verification request" />
          </div>
        )}

        {step === 'done' && (
          <>
            <p className="discover-setup-sheet__lead">
              Verification submitted. We&apos;ll notify you in the app when you&apos;re verified.
            </p>
            <button type="button" className="discover-setup-sheet__btn" onClick={handleClose}>
              Done
            </button>
          </>
        )}
      </div>
    </ProfileSheet>
  );
}
