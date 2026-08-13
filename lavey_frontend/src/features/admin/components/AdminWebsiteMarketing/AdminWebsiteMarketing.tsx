import type { CommandOverview } from '@/services/admin/adminOpsService';
import './AdminWebsiteMarketing.css';

interface AdminWebsiteMarketingProps {
  overview: CommandOverview | null;
  loading?: boolean;
}

function formatDownloadDate(value: string): string {
  return new Date(value).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminWebsiteMarketing({ overview, loading }: AdminWebsiteMarketingProps) {
  const stats = [
    { label: 'Total visits', value: overview?.websiteVisits },
    { label: 'Unique visitors', value: overview?.websiteUniqueVisitors },
    { label: 'Downloads', value: overview?.websiteDownloads },
    { label: 'Referral visits (24h)', value: overview?.websiteReferralVisits },
    { label: 'Referred downloads', value: overview?.websiteReferredDownloads },
  ];

  return (
    <section className="admin-marketing-page" aria-label="Website marketing">
      <header className="admin-marketing-page__head">
        <div>
          <h3>Website marketing</h3>
          <p>First-party visits and consented Lavey APK downloads.</p>
        </div>
      </header>

      <div className="admin-marketing admin-surface-card">
        <div className="admin-marketing__stats">
          {stats.map((stat) => (
            <article key={stat.label}>
              <span>{stat.label}</span>
              <strong>{loading ? '—' : stat.value?.toLocaleString() ?? '—'}</strong>
            </article>
          ))}
        </div>

        <div className="admin-marketing__leads">
          <h5>Recent anonymous downloads</h5>
          {loading ? (
            <p className="admin-marketing__empty">Loading download activity…</p>
          ) : overview?.recentWebsiteDownloads.length ? (
            <div>
              {overview.recentWebsiteDownloads.map((lead) => (
                <article key={lead.id}>
                  <strong>
                    Visitor {lead.visitorId.slice(0, 8)}
                    {lead.referralCode ? ` · Referred by ${lead.referralCode}` : ''}
                  </strong>
                  <span>{formatDownloadDate(lead.downloadedAt)}</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="admin-marketing__empty">No website downloads recorded yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
