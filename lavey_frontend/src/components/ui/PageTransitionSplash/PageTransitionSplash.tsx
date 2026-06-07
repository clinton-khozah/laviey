import { APP_IMAGES } from '@/constants/images';
import './PageTransitionSplash.css';

export function PageTransitionSplash() {
  return (
    <div className="page-transition-splash" aria-hidden>
      <img src={APP_IMAGES.logo} alt="" className="page-transition-splash__logo" />
    </div>
  );
}
