import { APP_IMAGES } from '@/constants/images';
import { useAuth } from '@/hooks';
import './SignInRequiredPrompt.css';

interface SignInRequiredPromptProps {
  message?: string;
  className?: string;
  onBeforeSignIn?: () => void;
}

export function SignInRequiredPrompt({
  message = 'Please sign in to continue.',
  className = '',
  onBeforeSignIn,
}: SignInRequiredPromptProps) {
  const { signOut } = useAuth();

  const handleSignIn = () => {
    onBeforeSignIn?.();
    void signOut();
  };

  return (
    <div className={`sign-in-required ${className}`.trim()} role="status">
      <div className="sign-in-required__art" aria-hidden>
        <div className="sign-in-required__glow" />
        <svg className="sign-in-required__scene" viewBox="0 0 200 160" fill="none">
          <ellipse cx="100" cy="132" rx="62" ry="10" fill="url(#signInShadow)" opacity="0.35" />
          <rect x="58" y="52" width="84" height="68" rx="18" fill="url(#signInCard)" />
          <rect x="68" y="62" width="64" height="48" rx="12" fill="rgba(255,255,255,0.12)" />
          <circle cx="100" cy="84" r="14" stroke="rgba(255,255,255,0.9)" strokeWidth="3" />
          <path
            d="M100 98v10M92 108h16"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M82 52V44a18 18 0 0136 0v8"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="154" cy="42" r="4" fill="#fbbf24" opacity="0.9" />
          <circle cx="46" cy="58" r="3" fill="#a78bfa" opacity="0.85" />
          <circle cx="162" cy="88" r="2.5" fill="#fb7185" opacity="0.8" />
          <defs>
            <linearGradient id="signInCard" x1="58" y1="52" x2="142" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a855f7" />
              <stop offset="0.55" stopColor="#ec4899" />
              <stop offset="1" stopColor="#ff4d6d" />
            </linearGradient>
            <radialGradient id="signInShadow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(100 132) scale(62 10)">
              <stop stopColor="#000" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
        <img src={APP_IMAGES.logo} alt="" className="sign-in-required__logo" />
      </div>

      <h3 className="sign-in-required__title">Sign in to continue</h3>
      <p className="sign-in-required__message">{message}</p>

      <button type="button" className="sign-in-required__cta" onClick={handleSignIn}>
        Sign in
      </button>
    </div>
  );
}
