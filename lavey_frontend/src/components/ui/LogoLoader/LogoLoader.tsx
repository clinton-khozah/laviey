import { APP_IMAGES } from '@/constants/images';
import './LogoLoader.css';

interface LogoLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function LogoLoader({ size = 'md', className = '', label = 'Loading' }: LogoLoaderProps) {
  return (
    <span
      className={`logo-loader logo-loader--${size} ${className}`.trim()}
      role="status"
      aria-label={label}
    >
      <img src={APP_IMAGES.logo} alt="" className="logo-loader__mark" />
    </span>
  );
}
