import { useMemo, useState } from 'react';
import { applyAlgorithm, getAppliedAlgorithm } from '@/features/admin/algorithm/algorithmConfig';
import { AdminAlgorithmCharts } from './AdminAlgorithmCharts';
import {
  ALGORITHMS,
  PLATFORM_ALGORITHM_KPIS,
  RESULT_WINDOWS,
  getAlgorithm,
  getCompareMaxes,
  type AlgorithmId,
  type AlgorithmResults,
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
  key: keyof AlgorithmResults;
  label: string;
  format: (v: number) => string;
  deltaKey?: keyof AlgorithmResults;
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
  const [activeId, setActiveId] = useState<AlgorithmId>('swipe-index');
  const [resultsWindow, setResultsWindow] = useState<ResultsWindow>('30d');
  const [applied, setApplied] = useState(() => getAppliedAlgorithm());
  const [applyNotice, setApplyNotice] = useState('');

  const algorithm = useMemo(() => getAlgorithm(activeId), [activeId]);
  const results = algorithm.resultsByWindow[resultsWindow];
  const windowLabel = RESULT_WINDOWS.find((w) => w.id === resultsWindow)?.label ?? '';
  const compareMax = useMemo(() => getCompareMaxes(resultsWindow), [resultsWindow]);
  const preview = FRONTEND_PREVIEW[activeId];
  const isLiveOnApp = applied?.id === activeId;

  const handleApply = () => {
    const config = applyAlgorithm(activeId);
    setApplied(config);
    setApplyNotice(`${config.name} is now live on the Discover feed. Open the app to see the new order.`);
    globalThis.setTimeout(() => setApplyNotice(''), 6000);
  };

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
            <strong>{PLATFORM_ALGORITHM_KPIS.activeAlgorithms}</strong>
          </article>
          <article>
            <span>Live on app</span>
            <strong>{applied ? applied.name : 'None'}</strong>
          </article>
          <article>
            <span>Avg match lift</span>
            <strong>{PLATFORM_ALGORITHM_KPIS.avgLiftMatches}</strong>
          </article>
          <article>
            <span>Attributed revenue (30d)</span>
            <strong>{PLATFORM_ALGORITHM_KPIS.attributedRevenue30d}</strong>
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

      <section className="admin-algo-overseer__section">
        <h4 className="admin-algo-overseer__section-title">1. Select algorithm</h4>
        <div className="admin-algo-overseer__picker" role="tablist" aria-label="Matching algorithms">
          {ALGORITHMS.map((algo, index) => (
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
          <AdminAlgorithmCharts algorithm={algorithm} results={results} compareMax={compareMax} />
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
                onClick={handleApply}
              >
                {isLiveOnApp ? 'Re-apply algorithm' : 'Apply to app'}
              </button>
              <p className="admin-algo-overseer__apply-hint">
                Changes the For You feed immediately for all members using mock data.
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
            {algorithm.id === 'engagement-ai' ? (
              <article className="admin-algo-overseer__results-highlight">
                <p>AI-assisted matches</p>
                <strong>68%</strong>
                <span>first 48h cohort</span>
              </article>
            ) : null}
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
                {ALGORITHMS.map((algo) => {
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
