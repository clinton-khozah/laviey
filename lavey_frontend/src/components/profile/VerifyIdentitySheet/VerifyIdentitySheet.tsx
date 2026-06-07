import { useCallback, useEffect, useState } from 'react';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { SheetSaveSuccess } from '@/components/profile/SheetSaveSuccess';
import { verificationService } from '@/services/verification/verificationService';
import { getUserFacingErrorMessage } from '@/utils/errors/userFacingErrorMessage';
import type { FaceCompareResult } from '@/utils/face/faceMatcher';
import { ReferenceUploadStep } from './ReferenceUploadStep';
import { LiveSelfieStep } from './LiveSelfieStep';
import { FaceMatchStep } from './FaceMatchStep';
import './VerifyIdentitySheet.css';

type VerifyFlowStep = 'intro' | 'reference' | 'live' | 'matching' | 'fail' | 'review';

interface VerifyIdentitySheetProps {
  open: boolean;
  verified: boolean;
  onClose: () => void;
  onVerify: () => void;
}

function sheetTitle(step: VerifyFlowStep, verified: boolean): string {
  if (verified) return 'Identity verified';
  switch (step) {
    case 'reference':
      return 'Upload reference photo';
    case 'live':
      return 'Take a live selfie';
    case 'matching':
      return 'Verifying…';
    case 'fail':
      return 'Verification failed';
    case 'review':
      return 'Review photos';
    default:
      return 'Verify identity';
  }
}

export function VerifyIdentitySheet({ open, verified, onClose, onVerify }: VerifyIdentitySheetProps) {
  const [step, setStep] = useState<VerifyFlowStep>('intro');
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<FaceCompareResult | null>(null);
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep('intro');
      setReferenceUrl(null);
      setLiveUrl(null);
      setMatchResult(null);
      setFailMessage(null);
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

  const completeVerification = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await verificationService.completeVerification();
      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(getUserFacingErrorMessage(error, 'Could not save verification.'));
      setIsSubmitting(false);
    }
  }, []);

  const handleMatchSuccess = useCallback((result: FaceCompareResult) => {
    setMatchResult(result);
    setStep('review');
    void completeVerification();
  }, [completeVerification]);

  const handleMatchFail = useCallback((message: string, result: FaceCompareResult | null) => {
    setFailMessage(message);
    setMatchResult(result);
    setStep('fail');
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
          <SheetSaveSuccess action="verify" onComplete={completeAfterSuccess} />
        ) : verified ? (
          <>
            <div className="verify-identity-sheet__icon verify-identity-sheet__icon--done">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h3 className="verify-identity-sheet__heading">You&apos;re verified</h3>
            <p className="verify-identity-sheet__text">
              Your profile shows a verified badge so matches know you&apos;re real.
            </p>
            {referenceUrl && liveUrl && (
              <div className="verify-identity-sheet__review-grid">
                <figure>
                  <img src={referenceUrl} alt="Reference photo" />
                  <figcaption>Reference</figcaption>
                </figure>
                <figure>
                  <img src={liveUrl} alt="Live selfie" />
                  <figcaption>Live selfie</figcaption>
                </figure>
              </div>
            )}
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
              Upload a clear front-facing photo, then take a live selfie. We compare them on your device.
            </p>
            <div className="verify-identity-sheet__photo-preview-row" aria-hidden>
              <div className="verify-identity-sheet__photo-placeholder">
                <span>1</span>
                <small>Gallery</small>
              </div>
              <div className="verify-identity-sheet__photo-placeholder">
                <span>2</span>
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
            onBack={() => setStep('intro')}
            onContinue={(url) => {
              setReferenceUrl(url);
              setStep('live');
            }}
          />
        ) : step === 'live' ? (
          <LiveSelfieStep
            onBack={() => setStep('reference')}
            onCapture={(url) => {
              setLiveUrl(url);
              setStep('matching');
            }}
          />
        ) : step === 'matching' && referenceUrl && liveUrl ? (
          <FaceMatchStep
            referenceUrl={referenceUrl}
            liveUrl={liveUrl}
            onMatch={handleMatchSuccess}
            onFail={handleMatchFail}
          />
        ) : step === 'fail' ? (
          <>
            <div className="verify-identity-sheet__icon verify-identity-sheet__icon--fail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <h3 className="verify-identity-sheet__heading">Couldn&apos;t verify</h3>
            <p className="verify-identity-sheet__text">{failMessage}</p>
            {matchResult && (
              <p className="verify-identity-sheet__match-score">
                Match confidence: {matchResult.confidencePercent}%
              </p>
            )}
            <div className="verify-identity-sheet__review-grid">
              {referenceUrl && (
                <figure>
                  <img src={referenceUrl} alt="Reference" />
                  <figcaption>Reference</figcaption>
                </figure>
              )}
              {liveUrl && (
                <figure>
                  <img src={liveUrl} alt="Live selfie" />
                  <figcaption>Selfie</figcaption>
                </figure>
              )}
            </div>
            <button type="button" className="verify-identity-sheet__btn" onClick={() => setStep('live')}>
              Retake selfie
            </button>
            <button
              type="button"
              className="verify-identity-sheet__btn verify-identity-sheet__btn--secondary"
              onClick={() => setStep('reference')}
            >
              Change reference photo
            </button>
          </>
        ) : step === 'review' ? (
          <>
            <div className="verify-identity-sheet__icon verify-identity-sheet__icon--done">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h3 className="verify-identity-sheet__heading">Faces matched</h3>
            <p className="verify-identity-sheet__text">
              {matchResult
                ? `${matchResult.confidencePercent}% confidence — saving your verified status…`
                : 'Saving your verified status…'}
            </p>
            {submitError && <p className="verify-face-match__error">{submitError}</p>}
            <div className="verify-identity-sheet__review-grid">
              <figure>
                <img src={referenceUrl ?? ''} alt="Reference" />
                <figcaption>Reference</figcaption>
              </figure>
              <figure>
                <img src={liveUrl ?? ''} alt="Live selfie" />
                <figcaption>Selfie</figcaption>
              </figure>
            </div>
            <button
              type="button"
              className="verify-identity-sheet__btn"
              disabled={isSubmitting}
              onClick={() => void completeVerification()}
            >
              {isSubmitting ? 'Saving…' : 'Finish'}
            </button>
          </>
        ) : null}
      </div>
    </ProfileSheet>
  );
}
