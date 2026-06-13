import { getFeedImageFit } from '@/utils/media/postPhotoOrientation';
import './PostForYouPreview.css';

interface PostForYouPreviewProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
}

export function PostForYouPreview({ imageUrl, imageWidth, imageHeight }: PostForYouPreviewProps) {
  const fit = getFeedImageFit(imageWidth, imageHeight);

  return (
    <div className="post-for-you-preview">
      <p className="post-for-you-preview__label">How it looks on For You</p>
      <div className="post-for-you-preview__phone" aria-hidden>
        <div className="post-for-you-preview__screen">
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className={`post-for-you-preview__img post-for-you-preview__img--${fit}`}
          />
        </div>
      </div>
      <p className="post-for-you-preview__hint">
        {fit === 'contain'
          ? 'Wide photos sit small with empty space — use a vertical phone pic instead.'
          : 'Tall portraits fill the feed nicely.'}
      </p>
    </div>
  );
}
