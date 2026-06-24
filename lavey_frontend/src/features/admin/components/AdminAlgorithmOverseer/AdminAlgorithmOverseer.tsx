import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyAlgorithm,
  getAppliedAlgorithm,
  subscribeAlgorithmChange,
} from '@/features/admin/algorithm/algorithmConfig';
import { adminAlgorithmService, type AlgorithmTrendSeries } from '@/services/admin/adminAlgorithmService';
import { AdminAlgorithmCharts } from './AdminAlgorithmCharts';
import {
  RESULT_WINDOWS,
  getAlgorithm,
  getCompareMaxes,
  type AlgorithmDefinition,
  type AlgorithmId,
  type PlatformOverview,
  type ResultsWindow,
} from './adminAlgorithmOverseer.data';
import './AdminAlgorithmOverseer.css';

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatHours(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k h`;
  return `${value.toLocaleString()} h`;
}

function formatRevenue(value: number): string {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1000) return `R ${(value / 1000).toFixed(0)}k`;
  return `R ${value.toLocaleString()}`;
}

function statusLabel(status: string): string {
  if (status === 'live') return 'Live';
  if (status === 'shadow') return 'Shadow';
  return 'Paused';
}

const PRIMARY_METRICS: {
  key: keyof AlgorithmDefinition['resultsByWindow']['30d'];
  label: string;
  format: (v: number) => string;
  deltaKey?: keyof AlgorithmDefinition['resultsByWindow']['30d'];
}[] = [
  { key: 'registrations', label: 'Registrations', format: formatNumber, deltaKey: 'registrationsDelta' },
  { key: 'matches', label: 'Matches', format: formatNumber, deltaKey: 'matchesDelta' },
  { key: 'subscriptions', label: 'Subscriptions', format: formatNumber, deltaKey: 'subscriptionsDelta' },
  { key: 'hoursOnApp', label: 'Hours on app', format: formatHours, deltaKey: 'hoursOnAppDelta' },
];

const FRONTEND_PREVIEW: Record<
  AlgorithmId,
  { feedTitle: string; feedDetail: string; order: string }
> = {
  'swipe-index': {
    feedTitle: 'For You · Swipe Index',
    feedDetail: 'Profiles ranked by engagement score — highest vibe / activity first.',
    order: 'Sorted by vibe score (TikTok-style deck)',
  },
  'affinity-proximity': {
    feedTitle: 'For You · Common Ground',
    feedDetail: 'Verified members with strongest interest overlap surface first.',
    order: 'Sorted by compatibility + verification',
  },
  'engagement-ai': {
    feedTitle: 'For You · Warm start',
    feedDetail: 'Members who already liked you and high-reply profiles prioritized.',
    order: 'Sorted for conversation warmth',
  },
};

export function AdminAlgorithmOverseer() {
  const [algorithms, setAlgorithms] = useState<AlgorithmDefinition[]>([]);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [trend, setTrend] = useState<AlgorithmTrendSeries | null>(null);
  const [activeId, setActiveId] = useState<AlgorithmId>('swipe-index');
  const [resultsWindow, setResultsWindow] = useState<ResultsWindow>('30d');
  const [applied, setApplied] = useState(() => getAppliedAlgorithm());
  const [applyNotice, setApplyNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [algoList, overviewData, active] = await Promise.all([
        adminAlgorithmService.listAlgorithms(),
        adminAlgorithmService.getOverview(resultsWindow),
        adminAlgorithmService.getActive(),
      ]);
      setAlgorithms(algoList);
      setOverview(overviewData);
      if (active) {
        setApplied({
          id: active.id,
          appliedAt: active.appliedAt,
          name: active.name,
          codename: active.codename,
          feedBanner: active.feedBanner,
        });
        setActiveId(active.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load algorithms');
    } finally {
      setLoading(false);
    }
  }, [resultsWindow]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    void adminAlgorithmService
      .getTrend(activeId)
      .then((series) => {
        if (!cancelled) setTrend(series);
      })
      .catch(() => {
        if (!cancelled) setTrend(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => subscribeAlgorithmChange(setApplied), []);

  const algorithm = useMemo(() => {
    if (algorithms.length === 0) return null;
    return getAlgorithm(algorithms, activeId);
  }, [algorithms, activeId]);

  const results = algorithm?.resultsByWindow[resultsWindow];
  const windowLabel = RESULT_WINDOWS.find((w) => w.id === resultsWindow)?.label ?? '';
  const compareMax = useMemo(
    () => (algorithms.length > 0 ? getCompareMaxes(algorithms, resultsWindow) : { matches: 1, registrations: 1 }),
    [algorithms, resultsWindow],
  );
  const preview = FRONTEND_PREVIEW[activeId];
  const isLiveOnApp = applied?.id === activeId;

  const handleApply = async () => {
    setApplying(true);
    setError('');
    try {
      const config = await applyAlgorithm(activeId);
      setApplied(config);
      const refreshed = await adminAlgorithmService.getOverview(resultsWindow);
      setOverview(refreshed);
      setApplyNotice(`${config.name} is now live on the Discover feed. Members will see the new order on their next refresh.`);
      globalThis.setTimeout(() => setApplyNotice(''), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply algorithm');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-algo-overseer">
        <p className="admin-algo-overseer__apply-notice">Loading algorithm data…</p>
      </div>
    );
  }

  if (error && algorithms.length === 0) {
    return (
      <div className="admin-algo-overseer">
        <p className="admin-algo-overseer__apply-notice">{error}</p>
      </div>
    );
  }

  if (!algorithm || !results) {
    return null;
  }

  return (
    <div className="admin-algo-overseer">
      <header className="admin-algo-overseer__head">
        <div className="admin-algo-overseer__head-copy">
          <h3>AI Overseer</h3>
          <p>Content and matching algorithms — visualize performance, then apply to change the member Discover feed.</p>
        </div>
        <div className="admin-algo-overseer__head-kpis">
          <article>
            <span>Algorithms</span>
            <strong>{overview?.activeAlgorithms ?? algorithms.length}</strong>
          </article>
          <article>
            <span>Live on app</span>
            <strong>{applied ? applied.name : overview?.liveOnApp?.name ?? 'None'}</strong>
          </article>
          <article>
            <span>Avg match lift</span>
            <strong>{overview?.avgLiftMatches ?? '—'}</strong>
          </article>
          <article>
            <span>Attributed revenue (30d)</span>
            <strong>{overview?.attributedRevenue30d ?? '—'}</strong>
          </article>
        </div>
      </header>

      {applied ? (
        <div className="admin-algo-overseer__live-banner">
          <span className="admin-algo-overseer__live-dot" aria-hidden />
          <div>
            <strong>Currently live on frontend</strong>
            <p>
              {applied.name} ({applied.codename}) — applied{' '}
              {new Date(applied.appliedAt).toLocaleString('en-ZA', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </div>
      ) : null}

      {applyNotice ? <p className="admin-algo-overseer__apply-notice">{applyNotice}</p> : null}
      {error ? <p className="admin-algo-overseer__apply-notice">{error}</p> : null}

      <section className="admin-algo-overseer__section">
        <h4 className="admin-algo-overseer__section-title">1. Select algorithm</h4>
        <div className="admin-algo-overseer__picker" role="tablist" aria-label="Matching algorithms">
          {algorithms.map((algo, index) => (
            <button
              key={algo.id}
              type="button"
              role="tab"
              aria-selected={activeId === algo.id}
              className={`admin-algo-overseer__picker-item ${activeId === algo.id ? 'is-active' : ''} ${applied?.id === algo.id ? 'is-live' : ''}`}
              data-algo={algo.id}
              onClick={() => setActiveId(algo.id)}
            >
              <span className="admin-algo-overseer__picker-step">{index + 1}</span>
              <span className="admin-algo-overseer__picker-body">
                <span className="admin-algo-overseer__picker-pattern">{algo.pattern}</span>
                <strong>{algo.name}</strong>
                <em>{algo.codename}</em>
                {applied?.id === algo.id ? <span className="admin-algo-overseer__picker-live">On app</span> : null}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="admin-algo-overseer__body" key={activeId}>
        <section className="admin-algo-overseer__section admin-algo-overseer__section--card">
          <div className="admin-algo-overseer__section-head">
            <h4 className="admin-algo-overseer__section-title">2. Visual performance</h4>
            <div className="admin-algo-overseer__windows" role="tablist" aria-label="Chart period">
              {RESULT_WINDOWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={resultsWindow === option.id}
                  className={resultsWindow === option.id ? 'is-active' : ''}
                  onClick={() => setResultsWindow(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <AdminAlgorithmCharts algorithm={algorithm} results={results} compareMax={compareMax} trend={trend} />
        </section>

        <section className="admin-algo-overseer__section admin-algo-overseer__section--card admin-algo-overseer__section--apply">
          <div className="admin-algo-overseer__apply-panel">
            <div>
              <h4 className="admin-algo-overseer__section-title">3. Apply to frontend</h4>
              <p className="admin-algo-overseer__section-sub">
                Pushes this algorithm to the member Discover feed (profile order + banner).
              </p>
              <div className="admin-algo-overseer__preview">
                <span className="admin-algo-overseer__preview-label">Discover preview</span>
                <div className="admin-algo-overseer__preview-phone">
                  <div className="admin-algo-overseer__preview-topbar">{preview.feedTitle}</div>
                  <div className="admin-algo-overseer__preview-cards">
                    <div />
                    <div />
                    <div />
                  </div>
                  <p>{preview.order}</p>
                </div>
                <p className="admin-algo-overseer__preview-detail">{preview.feedDetail}</p>
              </div>
            </div>
            <div className="admin-algo-overseer__apply-actions">
              <button
                type="button"
                className={`admin-algo-overseer__btn admin-algo-overseer__btn--apply ${isLiveOnApp ? 'is-applied' : ''}`}
                onClick={() => void handleApply()}
                disabled={applying}
              >
                {applying ? 'Applying…' : isLiveOnApp ? 'Re-apply algorithm' : 'Apply to app'}
              </button>
              <p className="admin-algo-overseer__apply-hint">
                Changes the For You feed immediately for all members on the next Discover load.
              </p>
              {isLiveOnApp ? (
                <span className="admin-algo-overseer__apply-badge">Active on Discover</span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="admin-algo-overseer__section admin-algo-overseer__section--card">
          <div className="admin-algo-overseer__section-head">
            <div>
              <h4 className="admin-algo-overseer__section-title">4. Algorithm overview</h4>
            </div>
            <div className="admin-algo-overseer__badges">
              <span className={`admin-algo-overseer__status admin-algo-overseer__status--${algorithm.status}`}>
                {statusLabel(algorithm.status)}
              </span>
              <span className="admin-algo-overseer__rollout">{algorithm.rollout}</span>
            </div>
          </div>

          <p className="admin-algo-overseer__codename">{algorithm.codename}</p>
          <h4 className="admin-algo-overseer__name">{algorithm.name}</h4>
          <p className="admin-algo-overseer__tagline">{algorithm.tagline}</p>
          <p className="admin-algo-overseer__description">{algorithm.description}</p>

          <div className="admin-algo-overseer__columns">
            <div className="admin-algo-overseer__block">
              <h5>How it works</h5>
              <ul>
                {algorithm.howItWorks.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="admin-algo-overseer__block admin-algo-overseer__block--guardrails">
              <h5>Guardrails</h5>
              <ul>
                {algorithm.guardrails.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="admin-algo-overseer__section admin-algo-overseer__section--card">
          <h4 className="admin-algo-overseer__section-title">5. Signal weights</h4>
          <div className="admin-algo-overseer__signal-grid">
            {algorithm.signals.map((signal) => (
              <article key={signal.label} className="admin-algo-overseer__signal">
                <div className="admin-algo-overseer__signal-head">
                  <strong>{signal.label}</strong>
                  <span>{signal.weight}%</span>
                </div>
                <div className="admin-algo-overseer__signal-bar" aria-hidden>
                  <span style={{ width: `${signal.weight}%` }} />
                </div>
                <p>{signal.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-algo-overseer__section admin-algo-overseer__section--card">
          <div className="admin-algo-overseer__section-head">
            <div>
              <h4 className="admin-algo-overseer__section-title">6. Period results</h4>
              <p className="admin-algo-overseer__section-sub">Metrics for {windowLabel.toLowerCase()}.</p>
            </div>
          </div>

          <div className="admin-algo-overseer__results-primary">
            {PRIMARY_METRICS.map((metric) => (
              <article key={metric.label}>
                <p>{metric.label}</p>
                <strong>{metric.format(results[metric.key] as number)}</strong>
                {metric.deltaKey ? (
                  <span className="admin-algo-overseer__delta admin-algo-overseer__delta--up">
                    {results[metric.deltaKey] as string}
                  </span>
                ) : null}
              </article>
            ))}
          </div>

          <div className="admin-algo-overseer__results-secondary">
            <article>
              <p>Match → chat</p>
              <strong>{results.matchToChatRate}%</strong>
            </article>
            <article>
              <p>7-day retention</p>
              <strong>{results.retention7d}%</strong>
            </article>
            <article>
              <p>Revenue attributed</p>
              <strong>{formatRevenue(results.revenueAttributed)}</strong>
            </article>
            <article>
              <p>Safety reports</p>
              <strong>{results.safetyReports}</strong>
            </article>
          </div>
        </section>

        <section className="admin-algo-overseer__section admin-algo-overseer__section--card admin-algo-overseer__section--compare">
          <h4 className="admin-algo-overseer__section-title">7. Compare all algorithms</h4>
          <p className="admin-algo-overseer__section-sub">{windowLabel} — side-by-side.</p>
          <div className="admin-algo-overseer__compare-table-wrap">
            <table className="admin-algo-overseer__compare-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Status</th>
                  <th>Registrations</th>
                  <th>Matches</th>
                  <th>Subscriptions</th>
                  <th>Hours on app</th>
                  <th>7d retention</th>
                </tr>
              </thead>
              <tbody>
                {algorithms.map((algo) => {
                  const row = algo.resultsByWindow[resultsWindow];
                  return (
                    <tr
                      key={algo.id}
                      className={`${algo.id === activeId ? 'is-active' : ''} ${applied?.id === algo.id ? 'is-live' : ''}`}
                    >
                      <td>
                        <strong>{algo.name}</strong>
                        <span>{algo.codename}</span>
                      </td>
                      <td>
                        <span className={`admin-algo-overseer__status admin-algo-overseer__status--${algo.status}`}>
                          {statusLabel(algo.status)}
                        </span>
                      </td>
                      <td>{formatNumber(row.registrations)}</td>
                      <td>{formatNumber(row.matches)}</td>
                      <td>{formatNumber(row.subscriptions)}</td>
                      <td>{formatHours(row.hoursOnApp)}</td>
                      <td>{row.retention7d}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
