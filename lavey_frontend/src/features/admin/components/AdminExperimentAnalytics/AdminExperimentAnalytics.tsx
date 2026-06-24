import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminOpsService, type AnalyticsSummary } from '@/services/admin/adminOpsService';
import {
  ANALYTICS_CURRENT_MONTH,
  ANALYTICS_YEARS,
  ENGAGEMENT_BY_YEAR,
  REGISTRATIONS_BY_YEAR,
  REVENUE_BY_YEAR,
  newUsersByDay,
  newUsersMonthTotal,
  newUsersPeakDay,
  yearlyRevenueTotal,
  type AnalyticsPeriod,
  type AnalyticsYear,
} from './adminExperimentAnalytics.data';
import './AdminExperimentAnalytics.css';

const CHART_WIDTH = 720;
const CHART_HEIGHT = 280;
const PAD = { top: 18, right: 52, bottom: 36, left: 48 };

const PERIOD_OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'monthly-revenue', label: 'Monthly revenue' },
  { id: 'active-users', label: 'Active users' },
  { id: 'new-users', label: 'New users' },
];

function formatUsers(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

function formatHours(value: number): string {
  return `${value.toFixed(1)}h`;
}

function formatRevenue(value: number): string {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1000) return `R ${(value / 1000).toFixed(0)}k`;
  return `R ${value.toLocaleString()}`;
}

function ChartPanel({
  title,
  description,
  legend,
  children,
}: {
  title: string;
  description: string;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="admin-experiment-analytics__card">
      <header className="admin-experiment-analytics__card-head">
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        {legend}
      </header>
      <div className="admin-experiment-analytics__chart-wrap">{children}</div>
    </article>
  );
}

export function AdminExperimentAnalytics() {
  const [year, setYear] = useState<AnalyticsYear>(new Date().getFullYear() as AnalyticsYear);
  const [period, setPeriod] = useState<AnalyticsPeriod>('monthly-revenue');
  const [liveSummary, setLiveSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void adminOpsService
      .getAnalyticsSummary(year)
      .then((summary) => {
        if (!cancelled) setLiveSummary(summary);
      })
      .catch(() => {
        if (!cancelled) setLiveSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const registrations = useMemo(() => {
    if (liveSummary?.year === year) {
      return liveSummary.monthlyRegistrations.map((row) => ({
        month: row.month,
        men: row.men,
        women: row.women,
      }));
    }
    return REGISTRATIONS_BY_YEAR[year];
  }, [liveSummary, year]);

  const engagement = useMemo(() => {
    if (liveSummary?.year === year) {
      return liveSummary.monthlyEngagement.map((row) => ({
        month: row.month,
        activeUsers: row.activeUsers,
        avgHours: row.avgHours,
      }));
    }
    return ENGAGEMENT_BY_YEAR[year];
  }, [liveSummary, year]);

  const revenue = useMemo(() => {
    if (liveSummary?.year === year) {
      return liveSummary.monthlyRevenue.map((row) => ({
        month: row.month,
        revenue: row.amount,
      }));
    }
    return REVENUE_BY_YEAR[year];
  }, [liveSummary, year]);

  const thisMonthRegistration = registrations.find((row) => row.month === ANALYTICS_CURRENT_MONTH) ?? registrations[4];
  const thisMonthEngagement = engagement.find((row) => row.month === ANALYTICS_CURRENT_MONTH) ?? engagement[4];
  const thisMonthRevenue = revenue.find((row) => row.month === ANALYTICS_CURRENT_MONTH) ?? revenue[4];

  const dailyNewUsers = useMemo(() => {
    if (liveSummary?.year === year && liveSummary.newMembersThisMonth > 0) {
      const daysInMonth = new Date(year, new Date().getMonth() + 1, 0).getDate();
      const total = liveSummary.newMembersThisMonth;
      const base = Math.floor(total / daysInMonth);
      let remainder = total - base * daysInMonth;
      return Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const extra = remainder > 0 ? 1 : 0;
        if (extra) remainder -= 1;
        return { day, users: base + extra };
      });
    }
    return newUsersByDay(year);
  }, [liveSummary, year]);

  const plotWidth = CHART_WIDTH - PAD.left - PAD.right;
  const plotHeight = CHART_HEIGHT - PAD.top - PAD.bottom;

  const revenueMax = useMemo(() => Math.max(...revenue.map((row) => row.revenue), 1), [revenue]);

  const newUsersMax = useMemo(
    () => Math.max(...dailyNewUsers.map((row) => row.users), 1),
    [dailyNewUsers],
  );

  const activeMax = useMemo(
    () => Math.max(...engagement.map((row) => row.activeUsers), 1),
    [engagement],
  );

  const hoursMax = useMemo(
    () => Math.max(...engagement.map((row) => row.avgHours), 1),
    [engagement],
  );

  const buildGroupWidth = (count: number) => plotWidth / Math.max(count, 1);
  const barWidthFor = (groupWidth: number) => Math.min(14, groupWidth * 0.22);

  const revenueBars = useMemo(() => {
    const groupWidth = buildGroupWidth(revenue.length);
    const barWidth = Math.min(22, groupWidth * 0.42);
    const baseY = PAD.top + plotHeight;

    return revenue.map((row, index) => {
      const centerX = PAD.left + groupWidth * index + groupWidth / 2;
      const height = (row.revenue / revenueMax) * plotHeight;

      return {
        month: row.month,
        centerX,
        isCurrent: row.month === ANALYTICS_CURRENT_MONTH,
        bar: { x: centerX - barWidth / 2, y: baseY - height, width: barWidth, height, value: row.revenue },
      };
    });
  }, [revenue, revenueMax, plotHeight]);

  const dailyNewUserBars = useMemo(() => {
    const groupWidth = buildGroupWidth(dailyNewUsers.length);
    const barWidth = Math.max(4, Math.min(10, groupWidth * 0.62));
    const baseY = PAD.top + plotHeight;

    return dailyNewUsers.map((row, index) => {
      const centerX = PAD.left + groupWidth * index + groupWidth / 2;
      const height = (row.users / newUsersMax) * plotHeight;

      return {
        day: row.day,
        centerX,
        showLabel: row.day === 1 || row.day % 5 === 0 || row.day === dailyNewUsers.length,
        bar: {
          x: centerX - barWidth / 2,
          y: baseY - height,
          width: barWidth,
          height,
          value: row.users,
        },
      };
    });
  }, [dailyNewUsers, newUsersMax, plotHeight]);

  const engagementPoints = useMemo(() => {
    const groupWidth = buildGroupWidth(engagement.length);
    const barWidth = barWidthFor(groupWidth);
    const baseY = PAD.top + plotHeight;

    return engagement.map((row, index) => {
      const x = PAD.left + groupWidth * index + groupWidth / 2;
      const barHeight = (row.activeUsers / activeMax) * plotHeight;

      return {
        month: row.month,
        x,
        barWidth,
        barY: baseY - barHeight,
        barHeight,
        lineY: baseY - (row.avgHours / hoursMax) * plotHeight,
        activeUsers: row.activeUsers,
        avgHours: row.avgHours,
      };
    });
  }, [engagement, activeMax, hoursMax, plotHeight]);

  const engagementLinePath = engagementPoints
    .filter((point) => point.activeUsers > 0)
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.lineY}`)
    .join(' ');

  const toolbarSummary = useMemo(() => {
    if (period === 'active-users') {
      const peakActive = Math.max(...engagement.map((row) => row.activeUsers), 0);
      return [
        { label: `${ANALYTICS_CURRENT_MONTH} ${year} active`, value: thisMonthEngagement.activeUsers.toLocaleString() },
        { label: 'Peak month', value: peakActive.toLocaleString() },
        { label: 'Avg time on platform', value: formatHours(thisMonthEngagement.avgHours) },
      ];
    }
    if (period === 'new-users') {
      const total = newUsersMonthTotal(year);
      const peak = newUsersPeakDay(year);
      const dailyAvg = Math.round(total / dailyNewUsers.length);
      return [
        { label: `${ANALYTICS_CURRENT_MONTH} ${year} total`, value: total.toLocaleString() },
        { label: 'Daily average', value: dailyAvg.toLocaleString() },
        { label: 'Peak day', value: `Day ${peak.day} · ${peak.users.toLocaleString()}` },
      ];
    }
    const yearRevenue = revenue.reduce((sum, row) => sum + row.revenue, 0);
    return [
      { label: `${year} revenue`, value: formatRevenue(yearRevenue) },
      { label: `${ANALYTICS_CURRENT_MONTH} revenue`, value: formatRevenue(thisMonthRevenue.revenue) },
      {
        label: 'YTD registrations',
        value: registrations
          .reduce((sum, row) => sum + row.men + row.women + ('other' in row ? Number(row.other) : 0), 0)
          .toLocaleString(),
      },
    ];
  }, [period, year, engagement, thisMonthEngagement, thisMonthRevenue, thisMonthRegistration, dailyNewUsers.length, registrations, revenue]);

  const yTicksFor = (max: number, formatter: (v: number) => string) =>
    [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: PAD.top + plotHeight - t * plotHeight,
      label: formatter(Math.round(max * t)),
    }));

  return (
    <div className="admin-experiment-analytics">
      <div className="admin-experiment-analytics__toolbar">
        <div className="admin-experiment-analytics__periods" role="tablist" aria-label="Analytics period">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              data-period={option.id}
              aria-selected={period === option.id}
              className={period === option.id ? 'is-active' : ''}
              onClick={() => setPeriod(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="admin-experiment-analytics__toolbar-row">
          <label className="admin-experiment-analytics__year-label" htmlFor="analytics-year">
            Year
          </label>
          <select
            id="analytics-year"
            className="admin-experiment-analytics__year-select"
            value={year}
            onChange={(event) => setYear(Number(event.target.value) as AnalyticsYear)}
          >
            {ANALYTICS_YEARS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="admin-experiment-analytics__toolbar-stats">
            {toolbarSummary.map((item) => (
              <span key={item.label}>
                <em>{item.label}</em>
                <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-experiment-analytics__panel" key={period}>
        {period === 'monthly-revenue' && (
          <ChartPanel
            title="Monthly revenue"
            description={`Revenue earned each month in ${year}.`}
          >
            <svg
              className="admin-experiment-analytics__chart admin-experiment-analytics__chart--revenue"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Monthly revenue for ${year}`}
            >
              <defs>
                <linearGradient id="admin-revenue-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              {yTicksFor(revenueMax, formatRevenue).map((tick) => (
                <g key={tick.label}>
                  <line
                    x1={PAD.left}
                    y1={tick.y}
                    x2={CHART_WIDTH - PAD.right}
                    y2={tick.y}
                    className="admin-experiment-analytics__grid-line"
                  />
                  <text x={PAD.left - 8} y={tick.y + 4} className="admin-experiment-analytics__axis-label">
                    {tick.label}
                  </text>
                </g>
              ))}
              {revenueBars.map((group) => (
                <g key={group.month}>
                  <rect
                    x={group.bar.x}
                    y={group.bar.y}
                    width={group.bar.width}
                    height={group.bar.height}
                    rx={4}
                    fill="url(#admin-revenue-bar)"
                    className={group.isCurrent ? 'admin-experiment-analytics__bar--current' : ''}
                  >
                    <title>{`${group.month} — ${formatRevenue(group.bar.value)}`}</title>
                  </rect>
                  <text
                    x={group.centerX}
                    y={CHART_HEIGHT - 12}
                    className={`admin-experiment-analytics__month-label ${
                      group.isCurrent ? 'admin-experiment-analytics__month-label--current' : ''
                    }`}
                  >
                    {group.month}
                  </text>
                </g>
              ))}
            </svg>
          </ChartPanel>
        )}

        {period === 'active-users' && (
          <ChartPanel
            title="Active users"
            description={`Monthly active members in ${year}; ${ANALYTICS_CURRENT_MONTH} highlighted (bars + avg hours line).`}
            legend={
              <div className="admin-experiment-analytics__legend">
                <span className="admin-experiment-analytics__legend-item admin-experiment-analytics__legend-item--active">
                  Active users
                </span>
                <span className="admin-experiment-analytics__legend-item admin-experiment-analytics__legend-item--hours">
                  Avg hours
                </span>
              </div>
            }
          >
            <svg
              className="admin-experiment-analytics__chart admin-experiment-analytics__chart--engagement"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Active users and average hours for ${year}`}
            >
              <defs>
                <linearGradient id="admin-eng-active" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c7d2fe" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              {yTicksFor(activeMax, formatUsers).map((tick) => (
                <g key={`active-${tick.label}`}>
                  <line
                    x1={PAD.left}
                    y1={tick.y}
                    x2={CHART_WIDTH - PAD.right}
                    y2={tick.y}
                    className="admin-experiment-analytics__grid-line"
                  />
                  <text x={PAD.left - 8} y={tick.y + 4} className="admin-experiment-analytics__axis-label">
                    {tick.label}
                  </text>
                </g>
              ))}
              {yTicksFor(hoursMax, formatHours).map((tick) => (
                <text
                  key={`hours-${tick.label}`}
                  x={CHART_WIDTH - PAD.right + 8}
                  y={tick.y + 4}
                  className="admin-experiment-analytics__axis-label admin-experiment-analytics__axis-label--right"
                >
                  {tick.label}
                </text>
              ))}
              {engagementPoints.map((point) =>
                point.activeUsers > 0 ? (
                  <rect
                    key={`bar-${point.month}`}
                    x={point.x - point.barWidth * 0.65}
                    y={point.barY}
                    width={point.barWidth * 1.3}
                    height={point.barHeight}
                    rx={4}
                    fill="url(#admin-eng-active)"
                    opacity={point.month === ANALYTICS_CURRENT_MONTH ? 1 : 0.85}
                  >
                    <title>{`${point.month} — ${point.activeUsers.toLocaleString()} active users`}</title>
                  </rect>
                ) : null,
              )}
              {engagementLinePath ? (
                <>
                  <path d={engagementLinePath} className="admin-experiment-analytics__line" fill="none" />
                  {engagementPoints
                    .filter((point) => point.activeUsers > 0)
                    .map((point) => (
                      <circle
                        key={`dot-${point.month}`}
                        cx={point.x}
                        cy={point.lineY}
                        r={point.month === ANALYTICS_CURRENT_MONTH ? 5 : 4}
                        className="admin-experiment-analytics__line-dot"
                      >
                        <title>{`${point.month} — ${point.avgHours.toFixed(1)}h avg`}</title>
                      </circle>
                    ))}
                </>
              ) : null}
              {engagementPoints.map((point) => (
                <text
                  key={`label-${point.month}`}
                  x={point.x}
                  y={CHART_HEIGHT - 12}
                  className={`admin-experiment-analytics__month-label ${
                    point.month === ANALYTICS_CURRENT_MONTH
                      ? 'admin-experiment-analytics__month-label--current'
                      : ''
                  }`}
                >
                  {point.month}
                </text>
              ))}
            </svg>
          </ChartPanel>
        )}

        {period === 'new-users' && (
          <ChartPanel
            title="New users"
            description={`Daily sign-ups in ${ANALYTICS_CURRENT_MONTH} ${year} (one bar per day).`}
          >
            <svg
              className="admin-experiment-analytics__chart admin-experiment-analytics__chart--new-users"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Daily new users for ${ANALYTICS_CURRENT_MONTH} ${year}`}
            >
              <defs>
                <linearGradient id="admin-new-users-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              {yTicksFor(newUsersMax, formatUsers).map((tick) => (
                <g key={tick.label}>
                  <line
                    x1={PAD.left}
                    y1={tick.y}
                    x2={CHART_WIDTH - PAD.right}
                    y2={tick.y}
                    className="admin-experiment-analytics__grid-line"
                  />
                  <text x={PAD.left - 8} y={tick.y + 4} className="admin-experiment-analytics__axis-label">
                    {tick.label}
                  </text>
                </g>
              ))}
              {dailyNewUserBars.map((group) => (
                <g key={group.day}>
                  <rect
                    x={group.bar.x}
                    y={group.bar.y}
                    width={group.bar.width}
                    height={group.bar.height}
                    rx={2}
                    fill="url(#admin-new-users-bar)"
                  >
                    <title>{`Day ${group.day} — ${group.bar.value.toLocaleString()} new users`}</title>
                  </rect>
                  {group.showLabel ? (
                    <text x={group.centerX} y={CHART_HEIGHT - 12} className="admin-experiment-analytics__month-label">
                      {group.day}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>
          </ChartPanel>
        )}
      </div>
    </div>
  );
}
