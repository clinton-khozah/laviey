import { useCallback, useEffect, useState } from 'react';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { SheetSaveSuccess } from '@/components/profile/SheetSaveSuccess';
import { verificationService } from '@/services/verification/verificationService';
import { getUserFacingErrorMessage } from '@/utils/errors/userFacingErrorMessage';
import { ReferenceUploadStep } from './ReferenceUploadStep';
import { LiveSelfieStep } from './LiveSelfieStep';
import './VerifyIdentitySheet.css';

type VerifyFlowStep = 'intro' | 'reference' | 'live' | 'submitting';

interface VerifyIdentitySheetProps {
  open: boolean;
  verified: boolean;
  /** User's current profile photo for reference verification */
  profilePhotoUrl?: string | null;
  onClose: () => void;
  onVerify: () => void;
}

function sheetTitle(step: VerifyFlowStep, verified: boolean): string {
  if (verified) return 'Identity verified';
  switch (step) {
    case 'reference':
      return 'Reference photo';
    case 'live':
      return 'Take a live selfie';
    case 'submitting':
      return 'Submitting…';
    default:
      return 'Verify identity';
  }
}

export function VerifyIdentitySheet({
  open,
  verified,
  profilePhotoUrl = null,
  onClose,
  onVerify,
}: VerifyIdentitySheetProps) {
  const [step, setStep] = useState<VerifyFlowStep>('intro');
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep('intro');
      setReferenceUrl(null);
      setLiveUrl(null);
      setIsSubmitting(false);
      setSubmitSuccess(false);
      setSubmitError(null);
    }
  }, [open]);

  const handleClose = () => {
    setStep('intro');
    setReferenceUrl(null);
    setLiveUrl(null);
    onClose();
  };

  const submitForReview = useCallback(async (reference: string, live: string) => {
    setStep('submitting');
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await verificationService.submitForManualReview(reference, live);
      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(getUserFacingErrorMessage(error, 'Could not submit verification.'));
      setStep('live');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const completeAfterSuccess = () => {
    onVerify();
    setSubmitSuccess(false);
    handleClose();
  };

  return (
    <ProfileSheet
      open={open}
      title={sheetTitle(step, verified)}
      onClose={handleClose}
      fromTop
      compact
      hideHandle
    >
      <div className="verify-identity-sheet">
        {submitSuccess ? (
          <SheetSaveSuccess action="verify-submitted" onComplete={completeAfterSuccess} />
        ) : verified ? (
          <>
            <div className="verify-identity-sheet__icon verify-identity-sheet__icon--done">
              <VerifiedBadge size="xl" />
            </div>
            <h3 className="verify-identity-sheet__heading">You&apos;re verified</h3>
            <p className="verify-identity-sheet__text">
              Your profile shows a verified badge so matches know you&apos;re real.
            </p>
            <button
              type="button"
              className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
              onClick={handleClose}
            >
              Done
            </button>
          </>
        ) : step === 'intro' ? (
          <>
            <div className="verify-identity-sheet__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <span className="verify-identity-sheet__status">Unverified</span>
            <h3 className="verify-identity-sheet__heading">Prove it&apos;s really you</h3>
            <p className="verify-identity-sheet__text">
              Upload a reference photo and take a live selfie. Our team will review your request and
              we&apos;ll notify you in the app when you&apos;re verified.
            </p>
            <div className="verify-identity-sheet__photo-preview-row" aria-hidden>
              <div className="verify-identity-sheet__photo-placeholder">
                <div className="verify-identity-sheet__photo-thumb">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="" className="verify-identity-sheet__intro-thumb" />
                  ) : (
                    <span>1</span>
                  )}
                </div>
                <small>{profilePhotoUrl ? 'Profile' : 'Reference'}</small>
              </div>
              <div className="verify-identity-sheet__photo-placeholder">
                <div className="verify-identity-sheet__photo-thumb">
                  <span>2</span>
                </div>
                <small>Live selfie</small>
              </div>
            </div>
            <button type="button" className="verify-identity-sheet__btn" onClick={() => setStep('reference')}>
              Start verification
            </button>
            <button
              type="button"
              className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
              onClick={handleClose}
            >
              Not now
            </button>
          </>
        ) : step === 'reference' ? (
          <ReferenceUploadStep
            profilePhotoUrl={profilePhotoUrl}
            onBack={() => setStep('intro')}
            onContinue={(url) => {
              setReferenceUrl(url);
              setStep('live');
            }}
          />
        ) : step === 'live' ? (
          <>
            <LiveSelfieStep
              onBack={() => setStep('reference')}
              onCapture={(url) => {
                setLiveUrl(url);
                if (referenceUrl) void submitForReview(referenceUrl, url);
              }}
            />
            {submitError ? <p className="verify-face-match__error">{submitError}</p> : null}
          </>
        ) : step === 'submitting' ? (
          <>
            <div className="verify-identity-sheet__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="verify-identity-sheet__heading">Sending your request</h3>
            <p className="verify-identity-sheet__text">
              {isSubmitting
                ? 'Uploading your photos for admin review…'
                : 'Almost done…'}
            </p>
          </>
        ) : null}
      </div>
    </ProfileSheet>
  );
}
