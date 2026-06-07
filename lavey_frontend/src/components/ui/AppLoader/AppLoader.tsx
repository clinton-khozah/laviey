import { APP_IMAGES } from '@/constants/images';
import './AppLoader.css';

export function AppLoader() {
  return (
    <div className="app-loader" role="status" aria-label="Loading Lavey">
      <img src={APP_IMAGES.logo} alt="" className="app-loader__bg" aria-hidden />
      <div className="app-loader__scrim" aria-hidden />
      <div className="app-loader__brand">
        <img src={APP_IMAGES.logoWithText} alt="Lavey" className="app-loader__logo-text" />
        <p className="app-loader__text">Feel the vibe before you match</p>
      </div>
    </div>
  );
}
