import type { AlgorithmDefinition, AlgorithmResults } from './adminAlgorithmOverseer.data';
import type { AlgorithmTrendSeries } from '@/services/admin/adminAlgorithmService';

const CHART_W = 400;
const CHART_H = 140;
const PAD = { t: 12, r: 12, b: 24, l: 36 };

interface AdminAlgorithmChartsProps {
  algorithm: AlgorithmDefinition;
  results: AlgorithmResults;
  compareMax: { matches: number; registrations: number };
  trend: AlgorithmTrendSeries | null;
}

function buildLinePath(values: number[], width: number, height: number): string {
  const max = Math.max(...values, 1);
  const plotW = width - PAD.l - PAD.r;
  const plotH = height - PAD.t - PAD.b;
  const step = plotW / Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = PAD.l + index * step;
      const y = PAD.t + plotH - (value / max) * plotH;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function buildAreaPath(values: number[], width: number, height: number): string {
  const max = Math.max(...values, 1);
  const plotW = width - PAD.l - PAD.r;
  const plotH = height - PAD.t - PAD.b;
  const step = plotW / Math.max(values.length - 1, 1);
  const baseY = PAD.t + plotH;

  const line = values
    .map((value, index) => {
      const x = PAD.l + index * step;
      const y = PAD.t + plotH - (value / max) * plotH;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const endX = PAD.l + (values.length - 1) * step;
  return `${line} L ${endX} ${baseY} L ${PAD.l} ${baseY} Z`;
}

export function AdminAlgorithmCharts({ algorithm, results, compareMax, trend }: AdminAlgorithmChartsProps) {
  const last14 = (trend?.matches ?? []).slice(-14);
  const linePath = buildLinePath(last14.length > 0 ? last14 : [0], CHART_W, CHART_H);
  const areaPath = buildAreaPath(last14.length > 0 ? last14 : [0], CHART_W, CHART_H);

  const matchPct = (results.matches / compareMax.matches) * 100;
  const regPct = (results.registrations / compareMax.registrations) * 100;

  const donutRadius = 52;
  const donutCx = 70;
  const donutCy = 70;
  let donutOffset = 0;
  const donutTotal = algorithm.signals.reduce((sum, s) => sum + s.weight, 0);

  const donutSegments = algorithm.signals.map((signal, index) => {
    const fraction = signal.weight / donutTotal;
    const length = fraction * 2 * Math.PI * donutRadius;
    const dasharray = `${length} ${2 * Math.PI * donutRadius}`;
    const segment = (
      <circle
        key={signal.label}
        cx={donutCx}
        cy={donutCy}
        r={donutRadius}
        fill="none"
        strokeWidth={14}
        stroke={`url(#donut-${algorithm.id}-${index})`}
        strokeDasharray={dasharray}
        strokeDashoffset={-donutOffset}
        transform={`rotate(-90 ${donutCx} ${donutCy})`}
      />
    );
    donutOffset += length;
    return segment;
  });

  const colors = ['#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#94a3b8'];

  return (
    <div className="admin-algo-overseer__charts">
      <article className="admin-algo-overseer__chart-card">
        <header>
          <h5>14-day match trend</h5>
          <span>Live trajectory for {algorithm.name}</span>
        </header>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="admin-algo-overseer__chart-svg" role="img" aria-hidden>
          <defs>
            <linearGradient id={`area-${algorithm.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD.t + (CHART_H - PAD.t - PAD.b) * (1 - t);
            return (
              <line
                key={t}
                x1={PAD.l}
                y1={y}
                x2={CHART_W - PAD.r}
                y2={y}
                className="admin-algo-overseer__chart-grid"
              />
            );
          })}
          <path d={areaPath} fill={`url(#area-${algorithm.id})`} />
          <path d={linePath} className="admin-algo-overseer__chart-line" fill="none" />
        </svg>
      </article>

      <article className="admin-algo-overseer__chart-card">
        <header>
          <h5>Signal mix</h5>
          <span>Weight distribution</span>
        </header>
        <div className="admin-algo-overseer__donut-wrap">
          <svg viewBox="0 0 140 140" className="admin-algo-overseer__donut-svg" aria-hidden>
            <defs>
              {algorithm.signals.map((_, index) => (
                <linearGradient key={index} id={`donut-${algorithm.id}-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={colors[index % colors.length]} />
                  <stop offset="100%" stopColor={colors[(index + 1) % colors.length]} />
                </linearGradient>
              ))}
            </defs>
            <circle cx={donutCx} cy={donutCy} r={donutRadius} fill="#f1f5f9" />
            {donutSegments}
            <text x={donutCx} y={donutCy - 4} textAnchor="middle" className="admin-algo-overseer__donut-center">
              {donutTotal}%
            </text>
            <text x={donutCx} y={donutCy + 12} textAnchor="middle" className="admin-algo-overseer__donut-sub">
              signals
            </text>
          </svg>
          <ul className="admin-algo-overseer__donut-legend">
            {algorithm.signals.map((signal, index) => (
              <li key={signal.label}>
                <span style={{ background: colors[index % colors.length] }} />
                {signal.label} · {signal.weight}%
              </li>
            ))}
          </ul>
        </div>
      </article>

      <article className="admin-algo-overseer__chart-card admin-algo-overseer__chart-card--wide">
        <header>
          <h5>Period impact</h5>
          <span>Matches vs registrations (selected window)</span>
        </header>
        <div className="admin-algo-overseer__bar-compare">
          <div>
            <span>Matches</span>
            <div className="admin-algo-overseer__bar-track">
              <span className="admin-algo-overseer__bar-fill admin-algo-overseer__bar-fill--matches" style={{ width: `${matchPct}%` }} />
            </div>
            <strong>{results.matches.toLocaleString()}</strong>
          </div>
          <div>
            <span>Registrations</span>
            <div className="admin-algo-overseer__bar-track">
              <span className="admin-algo-overseer__bar-fill admin-algo-overseer__bar-fill--reg" style={{ width: `${regPct}%` }} />
            </div>
            <strong>{results.registrations.toLocaleString()}</strong>
          </div>
          <div>
            <span>Hours on app</span>
            <div className="admin-algo-overseer__bar-track">
              <span
                className="admin-algo-overseer__bar-fill admin-algo-overseer__bar-fill--hours"
                style={{ width: `${Math.min(100, (results.hoursOnApp / 250000) * 100)}%` }}
              />
            </div>
            <strong>{(results.hoursOnApp / 1000).toFixed(1)}k h</strong>
          </div>
          <div>
            <span>Subscriptions</span>
            <div className="admin-algo-overseer__bar-track">
              <span
                className="admin-algo-overseer__bar-fill admin-algo-overseer__bar-fill--subs"
                style={{ width: `${Math.min(100, (results.subscriptions / 2500) * 100)}%` }}
              />
            </div>
            <strong>{results.subscriptions.toLocaleString()}</strong>
          </div>
        </div>
      </article>
    </div>
  );
}
