import { useEffect, useState } from 'react';
import { APP_IMAGES } from '@/constants/images';
import { getAdminSession } from '@/features/admin/session/adminSession';
import { adminAuthService } from '@/services/admin/adminAuthService';
import type { AdminAccount } from '@/types/domain/adminAuth.types';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { AdminAlgorithmOverseer } from '@/features/admin/components/AdminAlgorithmOverseer';
import { AdminExperimentAnalytics } from '@/features/admin/components/AdminExperimentAnalytics';
import { AdminSupportInbox } from '@/features/admin/components/AdminSupportInbox';
import { AdminContentModeration } from '@/features/admin/components/AdminContentModeration';
import { AdminUserManagement } from '@/features/admin/components/AdminUserManagement';
import { AdminQuickToolsPage, getToolPageMeta, isHrQuickTool, isOpsQuickTool, isQuickToolView, hrTabFromTool, TOOL_PAGE_META, type QuickToolId } from '@/features/admin/components/AdminQuickToolsPanel';
import { AdminHrHub } from '@/features/admin/components/AdminHrHub';
import { adminHrService } from '@/services/admin/adminHrService';
import { adminModerationService } from '@/services/admin/adminModerationService';
import { adminOpsService, type CommandOverview, type MonetizationWallet } from '@/services/admin/adminOpsService';
import { adminSupportService } from '@/services/admin/adminSupportService';
import './AdminDashboardPage.css';
import '@/features/admin/components/AdminQuickToolsPanel/AdminQuickToolsPanel.css';
import '@/features/admin/components/AdminHrHub/AdminHrHub.css';

interface AdminDashboardPageProps {
  adminPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

type AdminSectionId =
  | 'command'
  | 'users'
  | 'content'
  | 'comms'
  | 'monetization'
  | 'experiments'
  | 'ai';

interface ModuleCard {
  id: AdminSectionId;
  label: string;
  sub: string;
  icon: string;
  summary: string;
  capabilities: string[];
}

const MODULES: ModuleCard[] = [
  {
    id: 'command',
    label: 'Overview',
    sub: 'Command Center',
    icon: 'grid',
    summary: 'Dating KPIs plus monthly registration and engagement charts.',
    capabilities: [
      'Dating activity KPIs (DAU, matches/day, conversion, churn)',
      'Monthly revenue, this month, and yearly analytics views',
      'Registration and engagement charts with year filter',
    ],
  },
  {
    id: 'users',
    label: 'User Management',
    sub: 'Users & Verification',
    icon: 'user',
    summary: 'User database, verification queue, account enforcement, VIP tracking.',
    capabilities: [
      'User database with advanced search/filter',
      'Verification queue with approve/reject/escalate',
      'Restricted visibility controls and account actions',
      'High-value user tracker and churn watchlist',
    ],
  },
  {
    id: 'content',
    label: 'Content Control',
    sub: 'Moderation & Feed Quality',
    icon: 'target',
    summary: 'Review queues, member reports, and enforcement for a safe dating experience.',
    capabilities: [
      'Profile photo & post queue (AI pre-screen + human review)',
      'User reports triage (harassment, scams, fake profiles)',
      'Review queue with approve, remove, warn, and escalate',
      'Enforcement actions (hide, restrict, suspend, ban)',
    ],
  },
  {
    id: 'comms',
    label: 'Communication Hub',
    sub: 'Messaging & Push',
    icon: 'message',
    summary: 'Member support inbox — reply to Talk to us requests from the app.',
    capabilities: [
      'Support ticket inbox with unread indicators',
      'View member profile and posts while replying',
      'Status tracking: open, pending, resolved',
      'Automated welcome and auto-reply messages',
    ],
  },
  {
    id: 'monetization',
    label: 'Monetization Lab',
    sub: 'Gifts & Withdrawals',
    icon: 'wallet',
    summary: 'Manage member gift balances, send gifts, and control withdrawal access.',
    capabilities: [
      'User gift balance overview',
      'Enable or disable withdraw per member',
      'Admin gift sender with gifted status',
      'Gift and withdrawal activity tracking',
    ],
  },
  {
    id: 'experiments',
    label: 'Experimentation Lab',
    sub: 'Analytics & Rollouts',
    icon: 'box',
    summary: 'Registration trends by gender, active users, and time on platform.',
    capabilities: [
      'Monthly men vs women registration charts',
      'Year filter for historical sign-up trends',
      'Active users and average hours on platform',
    ],
  },
  {
    id: 'ai',
    label: 'AI Overseer',
    sub: 'Matching Algorithms',
    icon: 'chart',
    summary: 'Swipe index, affinity + distance, and engagement companion AI with period results.',
    capabilities: [
      'Swipe Index (TikTok-style deck ranking for match swipes)',
      'Affinity & Proximity (shared data + distance best-match suggestions)',
      'Engagement Companion AI (companion personas for cold-start momentum)',
      'Per-algorithm results: registrations, matches, subscriptions, hours on app',
    ],
  },
];

type AdminViewId = AdminSectionId | QuickToolId | 'settings';

const API_ENDPOINTS = [
  '/admin-api/dashboard',
  '/admin-api/users',
  '/admin-api/users/:id/shadow',
  '/admin-api/algorithm',
  '/admin-api/content/queue',
  '/admin-api/monetization/tiers',
  '/admin-api/monetization/promo',
  '/admin-api/features/flags',
  '/admin-api/experiments',
  '/admin-api/ai/insights',
  '/admin-api/notifications',
];

const COMMAND_KPIS_FALLBACK = [
  { label: 'Total members', value: '—', delta: 'Loading live data…', trend: 'up' as const, tone: 'blue' as const },
  { label: 'Swipes today', value: '—', delta: 'Discover activity', trend: 'up' as const, tone: 'red' as const },
  { label: 'Platinum members', value: '—', delta: 'Active subscriptions', trend: 'up' as const, tone: 'green' as const },
  { label: 'Needs attention', value: '—', delta: 'Moderation + support + HR', trend: 'down' as const, tone: 'amber' as const },
];

function commandKpisFromOverview(overview: CommandOverview | null) {
  if (!overview) return COMMAND_KPIS_FALLBACK;
  const attention = overview.moderationQueue + overview.openSupportTickets + overview.pendingHrItems;
  return [
    {
      label: 'Total members',
      value: overview.totalMembers.toLocaleString(),
      delta: `${overview.platinumMembers.toLocaleString()} Platinum`,
      trend: 'up' as const,
      tone: 'blue' as const,
    },
    {
      label: 'Swipes today',
      value: overview.matchesToday.toLocaleString(),
      delta: overview.activeAlgorithm ? `Live: ${overview.activeAlgorithm}` : 'No live algorithm',
      trend: 'up' as const,
      tone: 'red' as const,
    },
    {
      label: 'Platinum members',
      value: overview.platinumMembers.toLocaleString(),
      delta: `Revenue 30d: ${overview.revenueAttributed30d}`,
      trend: 'up' as const,
      tone: 'green' as const,
    },
    {
      label: 'Needs attention',
      value: attention.toLocaleString(),
      delta: `${overview.moderationQueue} mod · ${overview.openSupportTickets} support · ${overview.pendingHrItems} HR`,
      trend: attention > 0 ? ('down' as const) : ('up' as const),
      tone: 'amber' as const,
    },
  ];
}

function sectionBreadcrumb(id: AdminSectionId): string {
  if (id === 'command') return 'Admin / Overview';
  if (id === 'users') return 'Admin / User Management';
  if (id === 'content') return 'Admin / Content Control';
  if (id === 'comms') return 'Admin / Communication Hub';
  if (id === 'monetization') return 'Admin / Monetization';
  if (id === 'experiments') return 'Admin / Experimentation';
  return 'Admin / AI Overseer';
}

function adminDisplayInitials(displayName: string, email: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatAdminHeaderDate(): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

function KpiStatIcon({ tone }: { tone: 'blue' | 'red' | 'green' | 'amber' }) {
  if (tone === 'red') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    );
  }
  if (tone === 'green') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    );
  }
  if (tone === 'amber') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

const ADMIN_BASE = '/admin/19990808';

const SECTION_PATHS: Record<AdminSectionId, string> = {
  command: ADMIN_BASE,
  users: `${ADMIN_BASE}/user-management`,
  content: `${ADMIN_BASE}/content-control`,
  comms: `${ADMIN_BASE}/communication-hub`,
  monetization: `${ADMIN_BASE}/monetization-lab`,
  experiments: `${ADMIN_BASE}/experimentation-lab`,
  ai: `${ADMIN_BASE}/ai-overseer`,
};

const TOOL_PATHS: Record<QuickToolId, string> = {
  notifications: `${ADMIN_BASE}/notifications`,
  activity: `${ADMIN_BASE}/activity-log`,
  alerts: `${ADMIN_BASE}/system-alerts`,
  broadcast: `${ADMIN_BASE}/push-broadcast`,
  export: `${ADMIN_BASE}/data-export`,
  help: `${ADMIN_BASE}/help-center`,
  employees: `${ADMIN_BASE}/hr/employees`,
  'roles-pay': `${ADMIN_BASE}/hr/roles`,
  leaves: `${ADMIN_BASE}/hr/leaves`,
  claims: `${ADMIN_BASE}/hr/claims`,
};

const SETTINGS_PATH = `${ADMIN_BASE}/settings`;

const VIEW_PATHS: Record<AdminViewId, string> = {
  ...SECTION_PATHS,
  ...TOOL_PATHS,
  settings: SETTINGS_PATH,
};

const RIGHT_RAIL_GROUPS: Array<{
  title: string;
  subtitle?: string;
  items: typeof TOOL_PAGE_META;
}> = [
  {
    title: 'Shortcuts & alerts',
    subtitle: 'Ops utilities',
    items: TOOL_PAGE_META.filter((tool) => isOpsQuickTool(tool.id)),
  },
  {
    title: 'People & HR',
    subtitle: 'Team management',
    items: TOOL_PAGE_META.filter((tool) => isHrQuickTool(tool.id)),
  },
];

function viewFromPath(path: string): AdminViewId {
  if (path.includes('matching-studio') || path.includes('safety-compliance')) return 'experiments';
  if (path === SETTINGS_PATH || path.endsWith('/settings')) return 'settings';
  const entry = Object.entries(VIEW_PATHS).find(([, viewPath]) => viewPath === path);
  return (entry?.[0] as AdminViewId) ?? 'command';
}

function isModuleView(view: AdminViewId): view is AdminSectionId {
  return Object.prototype.hasOwnProperty.call(SECTION_PATHS, view);
}

function getViewMeta(view: AdminViewId): { label: string; summary: string; breadcrumb: string } {
  if (view === 'settings') {
    return {
      label: 'Settings',
      summary: 'Admin account, workspace preferences, and database setup guidance.',
      breadcrumb: 'Admin / Settings',
    };
  }
  if (isModuleView(view)) {
    const module = MODULES.find((item) => item.id === view) ?? MODULES[0]!;
    return {
      label: module.label,
      summary: module.summary,
      breadcrumb: sectionBreadcrumb(view),
    };
  }
  const tool = getToolPageMeta(view);
  return {
    label: tool.label,
    summary: tool.summary,
    breadcrumb: tool.breadcrumb,
  };
}

function MenuIcon({ kind }: { kind: string }) {
  if (kind === 'grid') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (kind === 'chart') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 19h16" />
        <path d="M7 16V9" />
        <path d="M12 16V6" />
        <path d="M17 16v-4" />
      </svg>
    );
  }
  if (kind === 'target') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (kind === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M16 12h4" />
      </svg>
    );
  }
  if (kind === 'briefcase') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
      </svg>
    );
  }
  if (kind === 'message') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    );
  }
  if (kind === 'bell') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5" />
        <path d="M9 17a3 3 0 006 0" />
      </svg>
    );
  }
  if (kind === 'activity') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  if (kind === 'shield') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (kind === 'megaphone') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M3 10v4h4l5 4V6L7 10H3z" />
        <path d="M16 8.5a5 5 0 010 7M19 5a9 9 0 010 14" />
      </svg>
    );
  }
  if (kind === 'download') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }
  if (kind === 'help') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 015 1c0 2-2.5 2-2.5 4" />
        <path d="M12 17h.01" />
      </svg>
    );
  }
  if (kind === 'team') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    );
  }
  if (kind === 'badge') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.3L12 14.8 7.2 16.8l.9-5.3L4.2 7.7l5.4-.8L12 2z" />
      </svg>
    );
  }
  if (kind === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }
  if (kind === 'clipboard') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    );
  }
  if (kind === 'logout') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    );
  }
  if (kind === 'file') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M14 3v5h5" />
      </svg>
    );
  }
  if (kind === 'box') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 3l8 4-8 4-8-4 8-4z" />
        <path d="M4 7v10l8 4 8-4V7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0114 0" />
    </svg>
  );
}

interface MonetizationWalletRow {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  plan: 'Platinum' | 'Free';
  giftBalance: number;
  withdrawEnabled: boolean;
  wasGifted: boolean;
  lastGiftAt?: string;
}

export function AdminDashboardPage({ adminPath, onNavigate, onLogout }: AdminDashboardPageProps) {
  const [activeView, setActiveView] = useState<AdminViewId>(() => viewFromPath(adminPath));
  const [maximized, setMaximized] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [adminOperator, setAdminOperator] = useState<AdminAccount | null>(
    () => getAdminSession()?.admin ?? null,
  );
  const [monetizationSearch, setMonetizationSearch] = useState('');
  const [monetizationNotice, setMonetizationNotice] = useState('');
  const [giftPanelUserId, setGiftPanelUserId] = useState<string | null>(null);
  const [giftAmount, setGiftAmount] = useState('100');
  const [monetizationWallets, setMonetizationWallets] = useState<MonetizationWalletRow[]>([]);
  const [monetizationLoading, setMonetizationLoading] = useState(false);
  const [commandOverview, setCommandOverview] = useState<CommandOverview | null>(null);
  const [experimentHead, setExperimentHead] = useState({ activeUsers30d: 0, avgHours: 0 });
  const [attentionCount, setAttentionCount] = useState(0);
  const [pendingHrLeaves, setPendingHrLeaves] = useState(0);
  const [pendingHrClaims, setPendingHrClaims] = useState(0);
  const pageMeta = getViewMeta(activeView);

  useEffect(() => {
    setActiveView(viewFromPath(adminPath));
  }, [adminPath]);

  useEffect(() => {
    void adminAuthService.restoreSession().then((session) => {
      setAdminOperator(session?.admin ?? getAdminSession()?.admin ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      adminModerationService.getStats().catch(() => null),
      adminSupportService.listTickets().catch(() => []),
    ]).then(([modStats, tickets]) => {
      if (cancelled) return;
      let count = 0;
      if (modStats) {
        count += modStats.aiPrescreen + modStats.humanReview + modStats.userReports;
      }
      count += tickets.filter((ticket) => ticket.unread).length;
      setAttentionCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [activeView]);

  useEffect(() => {
    let cancelled = false;
    void adminHrService
      .getOverview()
      .then((overview) => {
        if (!cancelled) {
          setPendingHrClaims(overview.pendingClaims);
          setPendingHrLeaves(overview.pendingLeaves);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPendingHrClaims(0);
          setPendingHrLeaves(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'command') return;
    let cancelled = false;
    void adminOpsService
      .getCommandOverview()
      .then((overview) => {
        if (!cancelled) setCommandOverview(overview);
      })
      .catch(() => {
        if (!cancelled) setCommandOverview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'experiments' && activeView !== 'command') return;
    let cancelled = false;
    const year = new Date().getFullYear();
    void adminOpsService
      .getAnalyticsSummary(year)
      .then((summary) => {
        if (!cancelled) {
          setExperimentHead({
            activeUsers30d: summary.activeUsers30d,
            avgHours: summary.avgHoursOnPlatform,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'monetization') return;
    let cancelled = false;
    setMonetizationLoading(true);
    void adminOpsService
      .listMonetizationWallets(monetizationSearch.trim() || undefined)
      .then((wallets) => {
        if (!cancelled) {
          setMonetizationWallets(
            wallets.map((w: MonetizationWallet) => ({
              id: w.id,
              name: w.name,
              handle: w.handle,
              avatar: w.avatarUrl ?? undefined,
              plan: w.plan,
              giftBalance: w.giftBalance,
              withdrawEnabled: w.withdrawEnabled,
              wasGifted: w.wasGifted,
              lastGiftAt: w.lastGiftAt
                ? adminOpsService.formatActivityTime(w.lastGiftAt)
                : undefined,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setMonetizationWallets([]);
      })
      .finally(() => {
        if (!cancelled) setMonetizationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeView, monetizationSearch]);

  const handleLogout = () => {
    adminAuthService.signOut();
    onLogout();
  };

  const switchView = (nextView: AdminViewId) => {
    if (nextView === activeView) return;
    setIsNavigating(true);
    setActiveView(nextView);
    window.setTimeout(() => {
      onNavigate(VIEW_PATHS[nextView]);
      setIsNavigating(false);
    }, 160);
  };

  const renderSectionBody = () => {
    if (isQuickToolView(activeView) && isHrQuickTool(activeView)) {
      return (
        <AdminHrHub
          initialTab={hrTabFromTool(activeView)}
          onPendingCountsChange={({ leaves, claims }) => {
            setPendingHrLeaves(leaves);
            setPendingHrClaims(claims);
          }}
        />
      );
    }

    if (isQuickToolView(activeView) && isOpsQuickTool(activeView)) {
      return (
        <AdminQuickToolsPage
          toolId={activeView}
          onOpenSupport={() => switchView('comms')}
          onOpenModeration={() => switchView('content')}
          onOpenUsers={() => switchView('users')}
          onOpenHr={() => switchView('employees')}
          onOpenAi={() => switchView('ai')}
        />
      );
    }

    if (activeView === 'settings') {
      return (
        <section className="admin-settings">
          <div className="admin-surface-card admin-settings__card">
            <h4>Admin account</h4>
            {adminOperator ? (
              <dl className="admin-settings__dl">
                <div>
                  <dt>Name</dt>
                  <dd>{adminOperator.displayName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{adminOperator.email}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>Super Admin</dd>
                </div>
              </dl>
            ) : (
              <p>Loading account…</p>
            )}
          </div>

          <div className="admin-surface-card admin-settings__card">
            <h4>Workspace</h4>
            <p>Full-width mode and quick navigation are available from the top bar and right rail.</p>
            <div className="admin-settings__actions">
              <button type="button" className="admin-settings__btn" onClick={() => switchView('notifications')}>
                Open notifications
              </button>
              <button type="button" className="admin-settings__btn" onClick={() => switchView('export')}>
                Data export
              </button>
              <button type="button" className="admin-settings__btn" onClick={() => switchView('broadcast')}>
                Push broadcast
              </button>
            </div>
          </div>

          <div className="admin-surface-card admin-settings__card">
            <h4>Database setup</h4>
            <p>If HR or ops features show schema errors, run these SQL migrations in Supabase (in order):</p>
            <ol className="admin-settings__sql-list">
              <li><code>042_admin_hr.sql</code> — HR tables</li>
              <li><code>046_hr_repair.sql</code> — column repairs</li>
              <li><code>047_hr_role_seeds.sql</code> — role catalog</li>
              <li><code>048_admin_ops.sql</code> — broadcasts & monetization</li>
            </ol>
          </div>

          <div className="admin-surface-card admin-settings__card admin-settings__card--danger">
            <h4>Session</h4>
            <p>Sign out of the admin dashboard on this device.</p>
            <button type="button" className="admin-settings__btn admin-settings__btn--logout" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </section>
      );
    }

    if (activeView === 'command') {
      const commandKpis = commandKpisFromOverview(commandOverview);
      return (
        <section className="admin-overview">
          <div className="admin-stat-grid admin-stat-grid--4">
            {commandKpis.map((kpi) => (
              <article key={kpi.label} className={`admin-stat-card admin-stat-card--${kpi.tone}`}>
                <div className="admin-stat-card__icon" aria-hidden>
                  <KpiStatIcon tone={kpi.tone} />
                </div>
                <div className="admin-stat-card__body">
                  <strong>{kpi.value}</strong>
                  <p>{kpi.label}</p>
                  <span className={`admin-stat-card__meta admin-stat-card__meta--${kpi.trend}`}>{kpi.delta}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="admin-overview__analytics admin-surface-card">
            <header className="admin-surface-card__head">
              <h4>Platform analytics</h4>
              <p>Registration trends, active members, and time spent on Lavey.</p>
            </header>
            <AdminExperimentAnalytics />
          </div>
        </section>
      );
    }

    if (activeView === 'users') {
      return <AdminUserManagement onOpenSupport={() => switchView('comms')} />;
    }

    if (activeView === 'comms') {
      return <AdminSupportInbox />;
    }

    if (activeView === 'ai') {
      return (
        <section className="admin-ai-overseer-shell">
          <AdminAlgorithmOverseer />
        </section>
      );
    }

    if (activeView === 'experiments') {
      return (
        <section className="admin-experiment-lab">
          <header className="admin-experiment-lab__head">
            <div>
              <h3>Experimentation Lab</h3>
              <p>Registration trends, active members, and time spent on Lavey.</p>
            </div>
            <div className="admin-experiment-lab__head-stats">
              <article>
                <span>Active users (30d)</span>
                <strong>{experimentHead.activeUsers30d.toLocaleString()}</strong>
              </article>
              <article>
                <span>Avg time on platform</span>
                <strong>{experimentHead.avgHours.toFixed(1)}h</strong>
              </article>
            </div>
          </header>

          <AdminExperimentAnalytics />
        </section>
      );
    }

    if (activeView === 'content') {
      return <AdminContentModeration />;
    }

    if (activeView === 'monetization') {
      const filteredWallets = monetizationWallets.filter((wallet) => {
        if (!monetizationSearch.trim()) return true;
        const q = monetizationSearch.toLowerCase();
        return wallet.name.toLowerCase().includes(q) || wallet.handle.toLowerCase().includes(q);
      });

      const totalGiftBalance = monetizationWallets.reduce((sum, wallet) => sum + wallet.giftBalance, 0);
      const withdrawEnabledCount = monetizationWallets.filter((wallet) => wallet.withdrawEnabled).length;
      const giftedCount = monetizationWallets.filter((wallet) => wallet.wasGifted).length;
      const giftPanelUser = monetizationWallets.find((wallet) => wallet.id === giftPanelUserId) ?? null;

      const toggleWithdraw = (walletId: string) => {
        const target = monetizationWallets.find((wallet) => wallet.id === walletId);
        if (!target) return;
        const next = !target.withdrawEnabled;
        void adminOpsService.patchMonetizationWallet(walletId, { withdrawEnabled: next }).then((updated) => {
          setMonetizationWallets((prev) =>
            prev.map((wallet) =>
              wallet.id === walletId
                ? {
                    ...wallet,
                    withdrawEnabled: updated.withdrawEnabled,
                  }
                : wallet,
            ),
          );
          setMonetizationNotice(
            next ? `Withdraw enabled for ${target.name}.` : `Withdraw disabled for ${target.name}.`,
          );
        }).catch((err) => {
          setMonetizationNotice(err instanceof Error ? err.message : 'Could not update wallet.');
        });
      };

      const sendGift = () => {
        if (!giftPanelUser) return;
        const amount = Math.max(1, Number(giftAmount) || 0);
        void adminOpsService.sendAdminGift(giftPanelUser.id, amount).then((updated) => {
          setMonetizationWallets((prev) =>
            prev.map((wallet) =>
              wallet.id === giftPanelUser.id
                ? {
                    ...wallet,
                    giftBalance: updated.giftBalance,
                    wasGifted: updated.wasGifted,
                    lastGiftAt: updated.lastGiftAt
                      ? adminOpsService.formatActivityTime(updated.lastGiftAt)
                      : 'Just now',
                  }
                : wallet,
            ),
          );
          setMonetizationNotice(`Gift of R${amount.toLocaleString()} sent to ${giftPanelUser.name}.`);
          setGiftPanelUserId(null);
          setGiftAmount('100');
        }).catch((err) => {
          setMonetizationNotice(err instanceof Error ? err.message : 'Gift failed.');
        });
      };

      return (
        <section className="admin-monetization-lab">
          <header className="admin-monetization-lab__head">
            <div>
              <h3>Monetization Lab</h3>
              <p>Manage gift balances, send gifts to members, and control who can withdraw.</p>
            </div>
          </header>

          <div className="admin-monetization-lab__stats">
            <article>
              <p>Total gift balance</p>
              <strong>R{totalGiftBalance.toLocaleString()}</strong>
            </article>
            <article>
              <p>Withdraw enabled</p>
              <strong>{withdrawEnabledCount}</strong>
            </article>
            <article>
              <p>Members gifted</p>
              <strong>{giftedCount}</strong>
            </article>
            <article>
              <p>Wallets tracked</p>
              <strong>{monetizationWallets.length}</strong>
            </article>
          </div>

          <div className="admin-monetization-lab__toolbar">
            <input
              type="text"
              placeholder="Search member name or handle..."
              value={monetizationSearch}
              onChange={(e) => setMonetizationSearch(e.target.value)}
            />
          </div>

          {giftPanelUser && (
            <div className="admin-monetization-lab__gift-panel">
              <div className="admin-monetization-lab__gift-panel-head">
                <h4>Send gift to {giftPanelUser.name}</h4>
                <button
                  type="button"
                  className="admin-monetization-lab__gift-panel-close"
                  onClick={() => setGiftPanelUserId(null)}
                  aria-label="Close gift panel"
                >
                  ×
                </button>
              </div>
              <p>Member will receive the gift and see a gifted status on their wallet.</p>
              <div className="admin-monetization-lab__gift-panel-row">
                <label>
                  Gift amount (R)
                  <input
                    type="number"
                    min={1}
                    value={giftAmount}
                    onChange={(e) => setGiftAmount(e.target.value)}
                  />
                </label>
                <button type="button" className="admin-monetization-lab__btn admin-monetization-lab__btn--primary" onClick={sendGift}>
                  Send gift
                </button>
              </div>
            </div>
          )}

          <div className="admin-monetization-lab__table-wrap">
            <table className="admin-monetization-lab__table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Plan</th>
                  <th>Gift balance</th>
                  <th>Status</th>
                  <th>Withdraw</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {monetizationLoading ? (
                  <tr>
                    <td colSpan={6} className="admin-monetization-lab__empty">
                      Loading member wallets…
                    </td>
                  </tr>
                ) : null}
                {!monetizationLoading &&
                  filteredWallets.map((wallet) => (
                  <tr key={wallet.id} className={wallet.wasGifted ? 'is-gifted' : ''}>
                    <td>
                      <div className="admin-monetization-lab__member">
                        <img
                          src={wallet.avatar ?? APP_IMAGES.logo}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = APP_IMAGES.logo;
                          }}
                        />
                        <div>
                          <strong>{wallet.name}</strong>
                          <span>{wallet.handle}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-monetization-lab__plan admin-monetization-lab__plan--${wallet.plan.toLowerCase()}`}>
                        {wallet.plan}
                      </span>
                    </td>
                    <td>
                      <strong className="admin-monetization-lab__balance">R{wallet.giftBalance.toLocaleString()}</strong>
                    </td>
                    <td>
                      {wallet.wasGifted ? (
                        <span className="admin-monetization-lab__badge admin-monetization-lab__badge--gifted">
                          Gifted
                          {wallet.lastGiftAt ? ` · ${wallet.lastGiftAt}` : ''}
                        </span>
                      ) : (
                        <span className="admin-monetization-lab__badge admin-monetization-lab__badge--none">Not gifted</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-monetization-lab__withdraw-toggle ${
                          wallet.withdrawEnabled ? 'is-enabled' : 'is-disabled'
                        }`}
                        onClick={() => toggleWithdraw(wallet.id)}
                      >
                        {wallet.withdrawEnabled ? 'Withdraw enabled' : 'Withdraw disabled'}
                      </button>
                    </td>
                    <td>
                      <div className="admin-monetization-lab__actions">
                        <button
                          type="button"
                          className="admin-monetization-lab__btn admin-monetization-lab__btn--primary"
                          onClick={() => {
                            setGiftPanelUserId(wallet.id);
                            setGiftAmount('100');
                          }}
                        >
                          Give gift
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!monetizationLoading && !filteredWallets.length && (
                  <tr>
                    <td colSpan={6} className="admin-monetization-lab__empty">
                      No members match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {monetizationNotice && <p className="admin-monetization-lab__notice">{monetizationNotice}</p>}
        </section>
      );
    }

    const activeModule = MODULES.find((m) => m.id === activeView) ?? MODULES[0];
    return (
      <div className="admin-dash-v2__panels">
        <div className="admin-dash-v2__panel admin-dash-v2__panel--big">
          <h4>{activeModule.label} Controls</h4>
          <p>Feature blueprint and core controls for this module.</p>
          <div className="admin-dash-v2__tags">
            {activeModule.capabilities.map((field) => (
              <span key={field}>{field}</span>
            ))}
          </div>
        </div>
        <div className="admin-dash-v2__panel">
          <h4>Technical Notes</h4>
          <ul className="admin-dash-v2__endpoint-list">
            {API_ENDPOINTS.map((endpoint) => (
              <li key={endpoint}>{endpoint}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderSideRail = (side: 'left' | 'right') => (
    <aside
      className={`admin-dash-v2__rail admin-dash-v2__rail--${side}`}
      aria-label={side === 'left' ? 'Admin navigation' : 'Admin quick tools'}
    >
      {side === 'left' ? (
        <div className="admin-dash-v2__rail-brand">
          <img src={APP_IMAGES.logo} alt="" />
          <strong>Lavey</strong>
        </div>
      ) : (
        <div className="admin-dash-v2__rail-head">
          <strong>Quick tools</strong>
        </div>
      )}
      {side === 'right'
        ? RIGHT_RAIL_GROUPS.map((group) => (
            <div key={group.title} className="admin-dash-v2__rail-group">
              <div className="admin-dash-v2__rail-group-head">
                <strong>{group.title}</strong>
                {group.subtitle ? <span>{group.subtitle}</span> : null}
              </div>
              <nav className="admin-dash-v2__rail-nav">
                {group.items.map((item) => (
                  <button
                    key={`right-${item.id}`}
                    type="button"
                    className={`admin-dash-v2__rail-item ${activeView === item.id ? 'admin-dash-v2__rail-item--active' : ''}`}
                    onClick={() => switchView(item.id)}
                    title={item.sub}
                  >
                    <span className="admin-dash-v2__rail-icon" aria-hidden>
                      <MenuIcon kind={item.icon} />
                    </span>
                    <span className="admin-dash-v2__rail-label">{item.label}</span>
                    {item.id === 'notifications' && attentionCount > 0 ? (
                      <span className="admin-dash-v2__rail-badge">{attentionCount > 9 ? '9+' : attentionCount}</span>
                    ) : null}
                    {item.id === 'leaves' && pendingHrLeaves > 0 ? (
                      <span className="admin-dash-v2__rail-badge">{pendingHrLeaves > 9 ? '9+' : pendingHrLeaves}</span>
                    ) : null}
                    {item.id === 'claims' && pendingHrClaims > 0 ? (
                      <span className="admin-dash-v2__rail-badge">{pendingHrClaims > 9 ? '9+' : pendingHrClaims}</span>
                    ) : null}
                  </button>
                ))}
              </nav>
            </div>
          ))
        : null}
      {side === 'left' ? (
        <nav className="admin-dash-v2__rail-nav">
          {MODULES.map((item) => (
            <button
              key={`left-${item.id}`}
              type="button"
              className={`admin-dash-v2__rail-item ${activeView === item.id ? 'admin-dash-v2__rail-item--active' : ''}`}
              onClick={() => switchView(item.id)}
            >
              <span className="admin-dash-v2__rail-icon" aria-hidden>
                <MenuIcon kind={item.icon} />
              </span>
              <span className="admin-dash-v2__rail-label">{item.label}</span>
            </button>
          ))}
        </nav>
      ) : null}
      {side === 'right' && adminOperator ? (
        <div className="admin-dash-v2__rail-profile admin-dash-v2__rail-profile--right">
          <div className="admin-dash-v2__rail-profile-avatar" aria-hidden>
            <span>{adminDisplayInitials(adminOperator.displayName, adminOperator.email)}</span>
          </div>
          <div className="admin-dash-v2__rail-profile-meta">
            <strong className="admin-dash-v2__rail-profile-name">{adminOperator.displayName}</strong>
            <span className="admin-dash-v2__rail-profile-role">Super Admin</span>
          </div>
        </div>
      ) : null}
      {side === 'left' ? (
        <div className="admin-dash-v2__rail-foot">
          <button
            type="button"
            className={`admin-dash-v2__rail-item ${activeView === 'settings' ? 'admin-dash-v2__rail-item--active' : ''}`}
            aria-label="Settings"
            onClick={() => switchView('settings')}
          >
            <span className="admin-dash-v2__rail-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </span>
            <span className="admin-dash-v2__rail-label">Settings</span>
          </button>
          <button
            type="button"
            className="admin-dash-v2__rail-item admin-dash-v2__rail-item--logout"
            aria-label="Logout"
            onClick={handleLogout}
          >
            <span className="admin-dash-v2__rail-icon" aria-hidden>
              <MenuIcon kind="logout" />
            </span>
            <span className="admin-dash-v2__rail-label">Logout</span>
          </button>
        </div>
      ) : null}
    </aside>
  );

  return (
    <main className={`admin-dash-v2 ${maximized ? 'admin-dash-v2--maximized' : ''}`}>
      <div className="admin-dash-v2__surface">
        {renderSideRail('left')}

        <div className="admin-dash-v2__workspace">
          <header className="admin-dash-v2__topbar">
            <p className="admin-dash-v2__topbar-title">{pageMeta.label}</p>
            <div className="admin-dash-v2__topbar-actions">
              <button
                type="button"
                className="admin-dash-v2__topbar-btn"
                aria-label={maximized ? 'Exit full width' : 'Full width content'}
                onClick={() => setMaximized((v) => !v)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  {maximized ? (
                    <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
                  ) : (
                    <path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6" />
                  )}
                </svg>
              </button>
              <button
                type="button"
                className={`admin-dash-v2__topbar-btn admin-dash-v2__topbar-btn--bell ${activeView === 'notifications' ? 'is-active' : ''}`}
                aria-label="Notifications"
                onClick={() => switchView('notifications')}
              >
                <MenuIcon kind="bell" />
                {attentionCount > 0 ? <span className="admin-dash-v2__topbar-dot" aria-hidden /> : null}
              </button>
              <time className="admin-dash-v2__topbar-date" dateTime={new Date().toISOString()}>
                {formatAdminHeaderDate()}
              </time>
            </div>
          </header>

          <div className="admin-dash-v2__content">
            <header className="admin-dash-v2__page-head">
              <div>
                <p className="admin-dash-v2__breadcrumb">{pageMeta.breadcrumb}</p>
                <h1>{pageMeta.label}</h1>
                <p className="admin-dash-v2__page-sub">{pageMeta.summary}</p>
              </div>
            </header>

            <div className="admin-dash-v2__main-body">{renderSectionBody()}</div>
          </div>
        </div>

        {renderSideRail('right')}
      </div>
      {isNavigating && <PageTransitionSplash />}
    </main>
  );
}
