import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { PageScroller } from '@/components/layout/PageScroller';
import './CollabPage.css';

export function CollabPage() {
  return (
    <div className="collab-page">
      <ScreenHeader title="Post" subtitle="Share a 10s vibe to your profile" />
      <PageScroller className="page-scroller--with-header">
        <div className="collab-page__placeholder">
          <span className="collab-page__icon" aria-hidden>
            +
          </span>
          <h2>New vibe</h2>
          <p>Record or upload a short clip for your profile feed. Coming soon.</p>
        </div>
      </PageScroller>
    </div>
  );
}
