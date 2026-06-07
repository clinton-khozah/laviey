import './VerifyProfileCard.css';

interface VerifyProfileCardProps {
  verified: boolean;
  onVerify: () => void;
}

export function VerifyProfileCard({ verified, onVerify }: VerifyProfileCardProps) {
  return (
    <section className="verify-profile-card" aria-labelledby="verify-profile-title">
      <div className="verify-profile-card__header">
        <h3 id="verify-profile-title" className="verify-profile-card__title">
          Verify your profile
        </h3>
        {verified && (
          <span className="verify-profile-card__badge" aria-label="Verified">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            Verified
          </span>
        )}
      </div>
      <p className="verify-profile-card__text">
        {verified
          ? 'Your profile shows a verified badge so matches know you are real.'
          : 'Add a verified badge so people trust you. Quick photo check — takes about a minute.'}
      </p>
      {!verified && (
        <button type="button" className="verify-profile-card__btn" onClick={onVerify}>
          Get verified
        </button>
      )}
    </section>
  );
}
