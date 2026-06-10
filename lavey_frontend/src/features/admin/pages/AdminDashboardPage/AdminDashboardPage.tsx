import { useEffect, useState } from 'react';
import { APP_IMAGES } from '@/constants/images';
import { pickMockFeedImage } from '@/constants/mockMedia';
import { PLATINUM_FEATURES, PLATINUM_PLANS } from '@/constants/platinum';
import { OnlineDateCard } from '@/components/rooms/OnlineDateCard/OnlineDateCard';
import { getAdminSession } from '@/features/admin/session/adminSession';
import { adminAuthService } from '@/services/admin/adminAuthService';
import type { AdminAccount } from '@/types/domain/adminAuth.types';
import type { OnlineDate } from '@/types';
import { storePendingMeetupCode } from '@/utils/meeting/meetupJoinLink';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { AdminAlgorithmOverseer } from '@/features/admin/components/AdminAlgorithmOverseer';
import { AdminExperimentAnalytics } from '@/features/admin/components/AdminExperimentAnalytics';
import { AdminSupportInbox } from '@/features/admin/components/AdminSupportInbox';
import { useAdminUsers } from '@/hooks/admin/useAdminUsers';
import type { AdminUserRecord } from '@/types/admin.types';
import './AdminDashboardPage.css';

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

interface LikerProfile {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  age: number;
  gender: string;
  city: string;
  about: string;
  lastActive: string;
  hoursPerDay: number;
  plan: 'Platinum' | 'Free';
  verified: boolean;
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

const COMMAND_KPIS = [
  { label: 'Total users (DAU)', value: '18,420', delta: '+6.2% vs last week', trend: 'up' as const, tone: 'blue' as const },
  { label: 'Matches per day', value: '3,284', delta: '+4.1% vs last week', trend: 'up' as const, tone: 'red' as const },
  { label: 'Active subscriptions', value: '1,437', delta: '+112 this month', trend: 'up' as const, tone: 'green' as const },
  { label: '30-day churn (freemode)', value: '4.9%', delta: '-0.3 pts vs prior', trend: 'down' as const, tone: 'amber' as const },
];

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

function createAvatarDataUri(name: string, bgColor: string): string {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="${bgColor}"/><text x="40" y="48" text-anchor="middle" font-size="28" font-family="Inter, Arial, sans-serif" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const LIKER_PROFILES: LikerProfile[] = [
  {
    id: 'liker-1',
    name: 'Mia Turner',
    handle: '@miaturner',
    avatar: createAvatarDataUri('Mia Turner', '#ef4444'),
    age: 26,
    gender: 'Female',
    city: 'Cape Town',
    about: 'Loves beach runs, jazz nights, and spontaneous road trips.',
    lastActive: '2m ago',
    hoursPerDay: 3.8,
    plan: 'Platinum',
    verified: true,
  },
  {
    id: 'liker-2',
    name: 'Noah Reed',
    handle: '@noahreed',
    avatar: createAvatarDataUri('Noah Reed', '#3b82f6'),
    age: 29,
    gender: 'Male',
    city: 'Johannesburg',
    about: 'Tech founder, gym regular, and foodie explorer.',
    lastActive: '8m ago',
    hoursPerDay: 2.1,
    plan: 'Free',
    verified: true,
  },
  {
    id: 'liker-3',
    name: 'Ava Daniels',
    handle: '@avadaniels',
    avatar: createAvatarDataUri('Ava Daniels', '#8b5cf6'),
    age: 24,
    gender: 'Female',
    city: 'Pretoria',
    about: 'Creative stylist who enjoys art shows and coffee dates.',
    lastActive: '18m ago',
    hoursPerDay: 4.2,
    plan: 'Platinum',
    verified: false,
  },
  {
    id: 'liker-4',
    name: 'Ethan Cole',
    handle: '@ethancole',
    avatar: createAvatarDataUri('Ethan Cole', '#0ea5e9'),
    age: 31,
    gender: 'Male',
    city: 'Durban',
    about: 'Surfer, entrepreneur, and sunset photographer.',
    lastActive: '27m ago',
    hoursPerDay: 1.7,
    plan: 'Free',
    verified: true,
  },
  {
    id: 'liker-5',
    name: 'Lina Brooks',
    handle: '@linabrooks',
    avatar: createAvatarDataUri('Lina Brooks', '#f97316'),
    age: 27,
    gender: 'Female',
    city: 'Port Elizabeth',
    about: 'Book lover, wellness coach, and brunch fanatic.',
    lastActive: '4m ago',
    hoursPerDay: 3.4,
    plan: 'Platinum',
    verified: true,
  },
];

const USER_TABLE_ROWS = [
  {
    name: 'Alice Smith',
    handle: '@alicesmith',
    avatar: createAvatarDataUri('Alice Smith', '#7c3aed'),
    payment: 'Visa · Ends in ****-**18',
    clickthrough: 48,
    subscribed: true,
    isNew: false,
    matches: 72,
    topUser: true,
    plan: 'Platinum',
    quizCompletion: 96,
    quizAnswers: [
      { question: 'What are you here for?', answer: 'Dating' },
      { question: 'Who are you interested in?', answer: 'Men' },
      { question: 'Your age preference?', answer: '22-32' },
      { question: 'Religion preference?', answer: 'Open to all' },
      { question: 'Top interests?', answer: 'Travel, Fitness, Music' },
    ],
    posts: ['Sunset walk by the beach tonight ✨', 'Gym session done. Feeling great!', 'Who is up for a travel buddy challenge?'],
    meetings: ['Coffee date - Saturday 7:00 PM', 'Video vibe check - Tuesday 8:30 PM'],
    lastSeen: '2m ago',
    age: 27,
    gender: 'Female',
  },
  {
    name: 'Bob Johnson',
    handle: '@bobjohnson',
    payment: 'Mastercard · Ends in ****-**99',
    clickthrough: 17,
    subscribed: false,
    isNew: true,
    matches: 14,
    topUser: false,
    plan: 'Free',
    quizCompletion: 78,
    quizAnswers: [
      { question: 'What are you here for?', answer: 'Friendship' },
      { question: 'Who are you interested in?', answer: 'Women' },
      { question: 'Your age preference?', answer: '24-34' },
      { question: 'Religion preference?', answer: 'Christian' },
      { question: 'Top interests?', answer: 'Movies, Football, Tech' },
    ],
    posts: ['New city, new energy.', 'Late-night coding and coffee.', 'Looking for real conversations.'],
    meetings: ['Lunch meetup - Friday 1:00 PM'],
    lastSeen: '18m ago',
    age: 31,
    gender: 'Male',
  },
  {
    name: 'Clara Garcia',
    handle: '@claragarcia',
    avatar: createAvatarDataUri('Clara Garcia', '#0ea5e9'),
    payment: 'Mastercard · Ends in ****-**14',
    clickthrough: 92,
    subscribed: true,
    isNew: true,
    matches: 110,
    topUser: true,
    plan: 'Platinum',
    quizCompletion: 100,
    quizAnswers: [
      { question: 'What are you here for?', answer: 'Both' },
      { question: 'Who are you interested in?', answer: 'Men' },
      { question: 'Your age preference?', answer: '24-34' },
      { question: 'Religion preference?', answer: 'Spiritual' },
      { question: 'Top interests?', answer: 'Cooking, Books, Travel' },
    ],
    posts: ['Just posted a new cooking reel.', 'Bookstore dates are elite.', 'Weekend travel plans loading...'],
    meetings: ['Museum date - Sunday 4:00 PM', 'Evening call - Thursday 9:00 PM'],
    lastSeen: '5m ago',
    age: 28,
    gender: 'Female',
  },
  {
    name: 'Emma Lee',
    handle: '@emmalee',
    avatar: createAvatarDataUri('Emma Lee', '#14b8a6'),
    payment: 'Mastercard · Ends in ****-**19',
    clickthrough: 49,
    subscribed: false,
    isNew: false,
    matches: 38,
    topUser: false,
    plan: 'Free',
    quizCompletion: 82,
    quizAnswers: [
      { question: 'What are you here for?', answer: 'Dating' },
      { question: 'Who are you interested in?', answer: 'Men' },
      { question: 'Your age preference?', answer: '23-31' },
      { question: 'Religion preference?', answer: 'Open to all' },
      { question: 'Top interests?', answer: 'Fashion, Wellness, Music' },
    ],
    posts: ['Morning routine locked in.', 'Music and matcha day.', 'Who loves fashion markets?'],
    meetings: [],
    lastSeen: '1h ago',
    age: 24,
    gender: 'Female',
  },
  {
    name: 'Grace Taylor',
    handle: '@gracetaylor',
    avatar: createAvatarDataUri('Grace Taylor', '#f97316'),
    payment: 'Visa · Ends in ****-**50',
    clickthrough: 77,
    subscribed: true,
    isNew: false,
    matches: 95,
    topUser: true,
    plan: 'Platinum',
    quizCompletion: 94,
    quizAnswers: [
      { question: 'What are you here for?', answer: 'Dating' },
      { question: 'Who are you interested in?', answer: 'Men' },
      { question: 'Your age preference?', answer: '25-35' },
      { question: 'Religion preference?', answer: 'Christian' },
      { question: 'Top interests?', answer: 'Travel, Business, Lifestyle' },
    ],
    posts: ['Airport mode again.', 'Business brunch this morning.', 'Looking for genuine energy.'],
    meetings: ['Dinner date - Saturday 8:00 PM'],
    lastSeen: '7m ago',
    age: 30,
    gender: 'Female',
  },
  {
    name: 'Isabella Clark',
    handle: '@isabellaclark',
    avatar: createAvatarDataUri('Isabella Clark', '#ec4899'),
    payment: 'Visa · Ends in ****-**80',
    clickthrough: 25,
    subscribed: false,
    isNew: true,
    matches: 19,
    topUser: false,
    plan: 'Free',
    quizCompletion: 67,
    quizAnswers: [
      { question: 'What are you here for?', answer: 'Friendship' },
      { question: 'Who are you interested in?', answer: 'Everyone' },
      { question: 'Your age preference?', answer: '21-30' },
      { question: 'Religion preference?', answer: 'Open to all' },
      { question: 'Top interests?', answer: 'AI, Coffee, Books' },
    ],
    posts: ['Coffee shop hopping this week.', 'AI talks > small talk.', 'Book recs please!'],
    meetings: [],
    lastSeen: '32m ago',
    age: 23,
    gender: 'Female',
  },
  {
    name: 'David Brown',
    handle: '@davidbrown',
    avatar: createAvatarDataUri('David Brown', '#3b82f6'),
    payment: 'Mastercard · Ends in ****-**96',
    clickthrough: 48,
    subscribed: true,
    isNew: false,
    matches: 57,
    topUser: false,
    plan: 'Platinum',
    quizCompletion: 88,
    quizAnswers: [
      { question: 'What are you here for?', answer: 'Dating' },
      { question: 'Who are you interested in?', answer: 'Women' },
      { question: 'Your age preference?', answer: '24-33' },
      { question: 'Religion preference?', answer: 'Christian' },
      { question: 'Top interests?', answer: 'Music, Movies, Fitness' },
    ],
    posts: ['Movie night was perfect.', 'Leg day complete.', 'New playlist out now.'],
    meetings: ['Coffee meetup - Monday 6:30 PM'],
    lastSeen: '12m ago',
    age: 29,
    gender: 'Male',
  },
  {
    name: 'Frank Wong',
    handle: '@frankwong',
    avatar: createAvatarDataUri('Frank Wong', '#10b981'),
    payment: 'Visa · Ends in ****-**28',
    clickthrough: 26,
    subscribed: false,
    isNew: true,
    matches: 23,
    topUser: false,
    plan: 'Free',
    quizCompletion: 74,
    quizAnswers: [
      { question: 'What are you here for?', answer: 'Both' },
      { question: 'Who are you interested in?', answer: 'Women' },
      { question: 'Your age preference?', answer: '22-31' },
      { question: 'Religion preference?', answer: 'Open to all' },
      { question: 'Top interests?', answer: 'Sports, Jogging, Gaming' },
    ],
    posts: ['Morning jog around the park.', 'Need gaming partner tonight.', 'Sports vibes all week.'],
    meetings: [],
    lastSeen: '53m ago',
    age: 26,
    gender: 'Male',
  },
  {
    name: 'Luna Brooks',
    handle: '@lunabrooks',
    avatar: createAvatarDataUri('Luna Brooks', '#8b5cf6'),
    payment: 'Visa · Ends in ****-**50',
    clickthrough: 77,
    subscribed: true,
    isNew: false,
    matches: 89,
    topUser: true,
    plan: 'Platinum',
    quizCompletion: 98,
    quizAnswers: [
      { question: 'What are you here for?', answer: 'Dating' },
      { question: 'Who are you interested in?', answer: 'Men' },
      { question: 'Your age preference?', answer: '24-35' },
      { question: 'Religion preference?', answer: 'Spiritual' },
      { question: 'Top interests?', answer: 'Beauty, Travel, Fashion' },
    ],
    posts: ['Skincare and self-care Sunday.', 'Travel board updated.', 'New outfit drop soon.'],
    meetings: ['Sunset date - Friday 7:30 PM'],
    lastSeen: '4m ago',
    age: 27,
    gender: 'Female',
  },
];

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

function sectionFromPath(path: string): AdminSectionId {
  if (path === ADMIN_BASE) return 'command';
  if (path.includes('matching-studio') || path.includes('safety-compliance')) return 'experiments';
  const entry = Object.entries(SECTION_PATHS).find(([, p]) => p === path);
  if (!entry) return 'command';
  return entry[0] as AdminSectionId;
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

export function AdminDashboardPage({ adminPath, onNavigate, onLogout }: AdminDashboardPageProps) {
  const [activeSection, setActiveSection] = useState<AdminSectionId>(() => sectionFromPath(adminPath));
  const [maximized, setMaximized] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [usersView, setUsersView] = useState<'all' | 'subscribed' | 'new' | 'matches' | 'top'>('all');
  const [usersPage, setUsersPage] = useState(1);
  const [likesPanelRowName, setLikesPanelRowName] = useState<string | null>(null);
  const [selectedLiker, setSelectedLiker] = useState<LikerProfile | null>(null);
  const [likesSearch, setLikesSearch] = useState('');
  const [likesFilter, setLikesFilter] = useState<'all' | 'verified' | 'female' | 'male'>('all');
  const [, setSelectedCommsProfile] = useState<LikerProfile | null>(null);
  const [selectedFullProfile, setSelectedFullProfile] = useState<LikerProfile | null>(null);
  const [selectedPlanUser, setSelectedPlanUser] = useState<{ name: string; plan: 'Platinum' | 'Free' } | null>(null);
  const [selectedViewedUser, setSelectedViewedUser] = useState<AdminUserRecord | null>(null);
  const [avatarFullView, setAvatarFullView] = useState<{ src: string; name: string } | null>(null);
  const [quizModalUser, setQuizModalUser] = useState<AdminUserRecord | null>(null);
  const [activityModalUser, setActivityModalUser] = useState<AdminUserRecord | null>(null);
  const [usersSearch, setUsersSearch] = useState('');
  const [adminOperator, setAdminOperator] = useState<AdminAccount | null>(
    () => getAdminSession()?.admin ?? null,
  );
  const [activityModalTab, setActivityModalTab] = useState<'posts' | 'meetings'>('posts');
  const [joiningMeetingId, setJoiningMeetingId] = useState<string | null>(null);
  const [copiedMeetingCode, setCopiedMeetingCode] = useState('');
  const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null);
  const [postModerationNotice, setPostModerationNotice] = useState('');
  const [meetingModerationNotice, setMeetingModerationNotice] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [contentActionNotice, setContentActionNotice] = useState('');
  const [activeContentMenuId, setActiveContentMenuId] = useState<string | null>(null);
  const [monetizationSearch, setMonetizationSearch] = useState('');
  const [monetizationNotice, setMonetizationNotice] = useState('');
  const [giftPanelUserId, setGiftPanelUserId] = useState<string | null>(null);
  const [giftAmount, setGiftAmount] = useState('100');
  const [monetizationWallets, setMonetizationWallets] = useState(() =>
    USER_TABLE_ROWS.map((row, index) => ({
      id: row.handle,
      name: row.name,
      handle: row.handle,
      avatar: row.avatar,
      plan: row.plan,
      giftBalance: [420, 85, 1240, 310, 0, 675, 152, 980, 44][index % 9] ?? 120,
      withdrawEnabled: index % 4 !== 0,
      wasGifted: index % 3 === 0,
      lastGiftAt: index % 3 === 0 ? '2 days ago' : undefined,
    })),
  );
  const activeModule = MODULES.find((m) => m.id === activeSection) ?? MODULES[0];
  const {
    users: adminUsers,
    summary: adminUsersSummary,
    total: adminUsersTotal,
    totalPages: adminUsersTotalPages,
    loading: adminUsersLoading,
    error: adminUsersError,
  } = useAdminUsers(usersView, usersPage, activeSection === 'users', usersSearch);
  const { users: contentReviewUsers } = useAdminUsers(
    'all',
    1,
    activeSection === 'content',
    contentSearch,
  );

  useEffect(() => {
    const fromPath = sectionFromPath(adminPath);
    setActiveSection(fromPath);
  }, [adminPath]);

  useEffect(() => {
    setUsersPage(1);
  }, [usersView]);

  useEffect(() => {
    void adminAuthService.restoreSession().then((session) => {
      setAdminOperator(session?.admin ?? getAdminSession()?.admin ?? null);
    });
  }, []);

  const handleLogout = () => {
    adminAuthService.signOut();
    onLogout();
  };

  const switchSection = (nextSection: AdminSectionId) => {
    if (nextSection === activeSection) return;
    setIsNavigating(true);
    setActiveSection(nextSection);
    window.setTimeout(() => {
      onNavigate(SECTION_PATHS[nextSection]);
      setIsNavigating(false);
    }, 160);
  };

  const renderSectionBody = () => {
    if (activeSection === 'command') {
      return (
        <section className="admin-overview">
          <div className="admin-stat-grid admin-stat-grid--4">
            {COMMAND_KPIS.map((kpi) => (
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

    if (activeSection === 'users') {
      const pagedRows = adminUsers;
      const filteredLikers = LIKER_PROFILES.filter((liker) => {
        const search = likesSearch.trim().toLowerCase();
        const matchesSearch =
          !search || liker.name.toLowerCase().includes(search) || liker.handle.toLowerCase().includes(search);
        if (!matchesSearch) return false;
        if (likesFilter === 'verified') return liker.verified;
        if (likesFilter === 'female') return liker.gender.toLowerCase() === 'female';
        if (likesFilter === 'male') return liker.gender.toLowerCase() === 'male';
        return true;
      });
      const totalPages = adminUsersTotalPages;
      const currentPage = Math.min(usersPage, totalPages);
      const pageStart = adminUsersTotal === 0 ? 0 : (currentPage - 1) * 10 + 1;
      const pageEnd = Math.min(currentPage * 10, adminUsersTotal);
      const hasInlineUsersPage = Boolean(
        likesPanelRowName || selectedFullProfile || selectedViewedUser || selectedPlanUser || quizModalUser || activityModalUser,
      );

      return (
        <section className="admin-customers-card">
          {!hasInlineUsersPage && (
            <>
              <div className="admin-stat-grid admin-stat-grid--3">
                <article className="admin-stat-card admin-stat-card--blue">
                  <div className="admin-stat-card__icon" aria-hidden>
                    <KpiStatIcon tone="blue" />
                  </div>
                  <div className="admin-stat-card__body">
                    <strong>{adminUsersSummary?.activeUsers.toLocaleString() ?? '—'}</strong>
                    <p>Active users</p>
                    <span className="admin-stat-card__meta admin-stat-card__meta--up">Live from database</span>
                  </div>
                </article>
                <article className="admin-stat-card admin-stat-card--green">
                  <div className="admin-stat-card__icon" aria-hidden>
                    <KpiStatIcon tone="green" />
                  </div>
                  <div className="admin-stat-card__body">
                    <strong>{adminUsersSummary?.subscribedMembers.toLocaleString() ?? '—'}</strong>
                    <p>Subscribed members</p>
                    <span className="admin-stat-card__meta">Platinum members</span>
                  </div>
                </article>
                <article className="admin-stat-card admin-stat-card--red">
                  <div className="admin-stat-card__icon" aria-hidden>
                    <KpiStatIcon tone="red" />
                  </div>
                  <div className="admin-stat-card__body">
                    <strong>{adminUsersSummary?.highMatchUsers.toLocaleString() ?? '—'}</strong>
                    <p>High match users</p>
                    <span className="admin-stat-card__meta">10+ matches</span>
                  </div>
                </article>
              </div>

              <div className="admin-filter-bar">
                <label className="admin-filter-bar__search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3-3" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, email, or handle..."
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      setUsersPage(1);
                    }}
                  />
                </label>
                <select className="admin-filter-bar__select" defaultValue="all" aria-label="Status filter">
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="restricted">Restricted</option>
                </select>
                <select className="admin-filter-bar__select" defaultValue="all" aria-label="Record filter">
                  <option value="all">All records</option>
                  <option value="verified">Verified</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>

              <div className="admin-customers-card__segments">
                <button
                  type="button"
                  className={usersView === 'all' ? 'is-active' : ''}
                  onClick={() => setUsersView('all')}
                >
                  All users
                </button>
                <button
                  type="button"
                  className={usersView === 'subscribed' ? 'is-active' : ''}
                  onClick={() => setUsersView('subscribed')}
                >
                  Subscribed users
                </button>
                <button
                  type="button"
                  className={usersView === 'new' ? 'is-active' : ''}
                  onClick={() => setUsersView('new')}
                >
                  New users
                </button>
                <button
                  type="button"
                  className={usersView === 'matches' ? 'is-active' : ''}
                  onClick={() => setUsersView('matches')}
                >
                  Most matches
                </button>
                <button
                  type="button"
                  className={usersView === 'top' ? 'is-active' : ''}
                  onClick={() => setUsersView('top')}
                >
                  Top users
                </button>
              </div>
            </>
          )}

          {!hasInlineUsersPage && (
            <div className="admin-customers-card__table-panel admin-surface-card">
              <header className="admin-surface-card__head admin-surface-card__head--table">
                <h4>Member records ({adminUsersTotal})</h4>
              </header>
              {adminUsersError ? (
                <p className="admin-customers-card__error">{adminUsersError}</p>
              ) : null}
              <div className="admin-users-table-wrap admin-users-table-wrap--customers">
                <table className="admin-users-table admin-users-table--customers">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Likes</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Total Matches</th>
                      <th>Plan</th>
                      <th>Last Seen</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsersLoading ? (
                      <tr>
                        <td colSpan={8}>
                          <p className="admin-customers-card__loading">Loading members…</p>
                        </td>
                      </tr>
                    ) : null}
                    {!adminUsersLoading && pagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          <p className="admin-customers-card__empty">No members found for this filter.</p>
                        </td>
                      </tr>
                    ) : null}
                    {!adminUsersLoading &&
                      pagedRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="admin-users-table__customer">
                            <img
                              src={row.avatarUrl ?? APP_IMAGES.logo}
                              alt={`${row.name} profile`}
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = APP_IMAGES.logo;
                              }}
                            />
                            <div>
                              <strong>{row.name}</strong>
                              <span>{row.handle}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-users-table__likes"
                            onClick={() => {
                              setLikesPanelRowName(row.name);
                              setSelectedLiker(LIKER_PROFILES[0] ?? null);
                              setLikesSearch('');
                              setLikesFilter('all');
                            }}
                            aria-label={`Open likes list for ${row.name}`}
                          >
                            <span className="admin-users-table__likes-icon" aria-hidden>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                                <path d="M12 20s-6.8-4.4-8.8-8A5.4 5.4 0 014.8 4.8 5.5 5.5 0 0112 6.9a5.5 5.5 0 017.2-2.1A5.4 5.4 0 0120.8 12c-2 3.6-8.8 8-8.8 8z" />
                              </svg>
                            </span>
                            {row.likes}
                          </button>
                        </td>
                        <td>
                          <span className="admin-users-table__metric admin-users-table__metric--age">
                            {row.age ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className="admin-users-table__metric admin-users-table__metric--gender">{row.gender}</span>
                        </td>
                        <td>
                          <span className="admin-users-table__metric admin-users-table__metric--matches">{row.matches}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`admin-pill admin-pill--plan admin-pill--${row.plan.toLowerCase()} admin-pill--interactive`}
                            onClick={() => setSelectedPlanUser({ name: row.name, plan: row.plan as 'Platinum' | 'Free' })}
                          >
                            {row.plan}
                          </button>
                        </td>
                        <td className="admin-users-table__last-seen">{row.lastSeen}</td>
                        <td>
                          <div className="admin-users-table__actions">
                            <button type="button" aria-label="View user" onClick={() => setSelectedViewedUser(row)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                                <circle cx="12" cy="12" r="2.6" />
                              </svg>
                            </button>
                            <button type="button" aria-label="Message user">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                              </svg>
                            </button>
                            <button type="button" className="admin-users-table__danger" aria-label="Ban user">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                <circle cx="12" cy="12" r="8" />
                                <path d="M7 17l10-10" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-users-table__pagination">
                <p>
                  Showing <strong>{adminUsersTotal === 0 ? 0 : pageStart}</strong>-
                  <strong>{pageEnd}</strong> of <strong>{adminUsersTotal}</strong>
                </p>
                <div>
                  <button type="button" disabled={currentPage <= 1} onClick={() => setUsersPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button>
                  <span>
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setUsersPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
          {likesPanelRowName && (
            <div className="admin-likes-modal" role="dialog" aria-modal="true" aria-label="Users who liked this profile">
              <button type="button" className="admin-likes-modal__backdrop" onClick={() => setLikesPanelRowName(null)} />
              <div className="admin-likes-modal__card">
                <header className="admin-likes-modal__head">
                  <div>
                    <h4>{likesPanelRowName} likes</h4>
                    <p>People who liked this profile. Click any card to view full details.</p>
                  </div>
                  <button type="button" onClick={() => setLikesPanelRowName(null)} aria-label="Close likes panel">
                    ×
                  </button>
                </header>

                <div className="admin-likes-modal__stats">
                  <article>
                    <span>Total Likes</span>
                    <strong>{LIKER_PROFILES.length}</strong>
                  </article>
                  <article>
                    <span>Verified</span>
                    <strong>{LIKER_PROFILES.filter((liker) => liker.verified).length}</strong>
                  </article>
                  <article>
                    <span>Platinum Mode</span>
                    <strong>{LIKER_PROFILES.filter((liker) => liker.plan === 'Platinum').length}</strong>
                  </article>
                </div>

                <div className="admin-likes-modal__toolbar">
                  <input
                    value={likesSearch}
                    onChange={(event) => setLikesSearch(event.target.value)}
                    placeholder="Search name or @handle"
                  />
                  <div className="admin-likes-modal__filters">
                    <button
                      type="button"
                      className={likesFilter === 'all' ? 'is-active' : ''}
                      onClick={() => setLikesFilter('all')}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={likesFilter === 'verified' ? 'is-active' : ''}
                      onClick={() => setLikesFilter('verified')}
                    >
                      Verified
                    </button>
                    <button
                      type="button"
                      className={likesFilter === 'female' ? 'is-active' : ''}
                      onClick={() => setLikesFilter('female')}
                    >
                      Female
                    </button>
                    <button
                      type="button"
                      className={likesFilter === 'male' ? 'is-active' : ''}
                      onClick={() => setLikesFilter('male')}
                    >
                      Male
                    </button>
                  </div>
                </div>

                <div className="admin-likes-modal__body">
                  <aside className="admin-likes-modal__list">
                    {filteredLikers.map((liker) => (
                      <button
                        key={liker.id}
                        type="button"
                        className={`admin-likes-modal__person ${selectedLiker?.id === liker.id ? 'is-active' : ''}`}
                        onClick={() => setSelectedLiker(liker)}
                      >
                        <img
                          src={liker.avatar ?? APP_IMAGES.logo}
                          alt={`${liker.name} profile`}
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = APP_IMAGES.logo;
                          }}
                        />
                        <div>
                          <strong>{liker.name}</strong>
                          <span>{liker.handle} · {liker.lastActive}</span>
                        </div>
                        {liker.verified && <em>Verified</em>}
                      </button>
                    ))}
                    {filteredLikers.length === 0 && <p className="admin-likes-modal__empty">No profiles found.</p>}
                  </aside>

                  <section className="admin-likes-modal__details">
                    {selectedLiker ? (
                      <>
                        <div className="admin-likes-modal__profile-head">
                          <img
                            src={selectedLiker.avatar ?? APP_IMAGES.logo}
                            alt={`${selectedLiker.name} profile`}
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = APP_IMAGES.logo;
                            }}
                          />
                          <div>
                            <h5>{selectedLiker.name}</h5>
                            <p>{selectedLiker.handle}</p>
                          </div>
                          {selectedLiker.verified && <span className="admin-likes-modal__verified-chip">Verified</span>}
                        </div>
                        <ul className="admin-likes-modal__info-grid">
                          <li>
                            <span>
                              <i aria-hidden>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <rect x="4" y="5" width="16" height="15" rx="2" />
                                  <path d="M8 3v4M16 3v4M4 10h16" />
                                </svg>
                              </i>
                              Age
                            </span>
                            <strong>{selectedLiker.age}</strong>
                          </li>
                          <li>
                            <span>
                              <i aria-hidden>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <circle cx="10" cy="14" r="5" />
                                  <path d="M14 10l6-6M15.5 4H20v4.5" />
                                </svg>
                              </i>
                              Gender
                            </span>
                            <strong>{selectedLiker.gender}</strong>
                          </li>
                          <li>
                            <span>
                              <i aria-hidden>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path d="M12 21s-6-5.4-6-10a6 6 0 1112 0c0 4.6-6 10-6 10z" />
                                  <circle cx="12" cy="11" r="2.4" />
                                </svg>
                              </i>
                              City
                            </span>
                            <strong>{selectedLiker.city}</strong>
                          </li>
                          <li>
                            <span>
                              <i aria-hidden>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <circle cx="12" cy="12" r="8" />
                                  <path d="M12 7v5l3 2" />
                                </svg>
                              </i>
                              Last Active
                            </span>
                            <strong>{selectedLiker.lastActive}</strong>
                          </li>
                          <li>
                            <span>
                              <i aria-hidden>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path d="M12 3l5 4-5 14L7 7l5-4z" />
                                </svg>
                              </i>
                              Mode
                            </span>
                            <strong>{selectedLiker.plan}</strong>
                          </li>
                          <li>
                            <span>
                              <i aria-hidden>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <rect x="7" y="3.5" width="10" height="17" rx="2" />
                                  <path d="M10 6h4M11 17h2" />
                                </svg>
                              </i>
                              Hours / Day
                            </span>
                            <strong>{Number(selectedLiker.hoursPerDay ?? 0).toFixed(1)}h</strong>
                          </li>
                        </ul>
                        <p className="admin-likes-modal__about">{selectedLiker.about}</p>
                        <div className="admin-likes-modal__detail-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setLikesPanelRowName(null);
                              setSelectedFullProfile(selectedLiker);
                            }}
                          >
                            View Full Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCommsProfile(selectedLiker);
                              setLikesPanelRowName(null);
                              switchSection('comms');
                            }}
                          >
                            Send Message
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>Select a profile to view details.</p>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}
          {selectedFullProfile && (
            <div className="admin-profile-preview-modal" role="dialog" aria-modal="true" aria-label="Full profile preview">
              <button
                type="button"
                className="admin-profile-preview-modal__backdrop"
                onClick={() => setSelectedFullProfile(null)}
              />
              <article className="admin-profile-preview-modal__card">
                <button
                  type="button"
                  className="admin-profile-preview-modal__close"
                  onClick={() => setSelectedFullProfile(null)}
                  aria-label="Close profile preview"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
                <div className="admin-profile-preview-modal__hero">
                  <img
                    src={selectedFullProfile.avatar ?? APP_IMAGES.logo}
                    alt={`${selectedFullProfile.name} profile`}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = APP_IMAGES.logo;
                    }}
                  />
                </div>
                <div className="admin-profile-preview-modal__body">
                  <h4>{selectedFullProfile.name}</h4>
                  <p>{selectedFullProfile.handle}</p>
                  <div className="admin-profile-preview-modal__chips">
                    <span>{selectedFullProfile.age}</span>
                    <span>{selectedFullProfile.gender}</span>
                    <span>{selectedFullProfile.city}</span>
                    <span>{selectedFullProfile.plan}</span>
                  </div>
                  <p className="admin-profile-preview-modal__about">{selectedFullProfile.about}</p>
                </div>
              </article>
            </div>
          )}
          {avatarFullView && (
            <div
              className="admin-avatar-fullview"
              role="dialog"
              aria-modal="true"
              aria-label={`${avatarFullView.name} profile photo`}
            >
              <button
                type="button"
                className="admin-avatar-fullview__backdrop"
                aria-label="Close full photo view"
                onClick={() => setAvatarFullView(null)}
              />
              <figure className="admin-avatar-fullview__frame">
                <button
                  type="button"
                  className="admin-avatar-fullview__close"
                  aria-label="Close full photo view"
                  onClick={() => setAvatarFullView(null)}
                >
                  ×
                </button>
                <img
                  src={avatarFullView.src}
                  alt={avatarFullView.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = APP_IMAGES.logo;
                  }}
                />
                <figcaption>{avatarFullView.name}</figcaption>
              </figure>
            </div>
          )}
          {selectedViewedUser && (
            <div className="admin-user-view-modal" role="dialog" aria-modal="true" aria-label="User full information">
              <button type="button" className="admin-user-view-modal__backdrop" onClick={() => setSelectedViewedUser(null)} />
              <article className="admin-user-view-modal__card">
                <button type="button" className="admin-user-view-modal__close" onClick={() => setSelectedViewedUser(null)} aria-label="Close user details">
                  ×
                </button>
                <div className="admin-user-view-modal__cover" />
                <div className="admin-user-view-modal__center-profile">
                  <button
                    type="button"
                    className="admin-user-view-modal__avatar-btn"
                    aria-label={`View ${selectedViewedUser.name} profile photo full size`}
                    onClick={() =>
                      setAvatarFullView({
                        src: selectedViewedUser.avatarUrl ?? APP_IMAGES.logo,
                        name: selectedViewedUser.name,
                      })
                    }
                  >
                    <img
                      src={selectedViewedUser.avatarUrl ?? APP_IMAGES.logo}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = APP_IMAGES.logo;
                      }}
                    />
                    <span className="admin-user-view-modal__avatar-btn-label">View full</span>
                  </button>
                  <h4>{selectedViewedUser.name}</h4>
                  <p>{selectedViewedUser.handle}</p>
                </div>
                <div className="admin-user-view-modal__stats">
                  <article className="admin-user-view-modal__stat">
                    <strong>{selectedViewedUser.likes}</strong>
                    <span>Likes</span>
                  </article>
                  <article className="admin-user-view-modal__stat">
                    <strong>{selectedViewedUser.matches}</strong>
                    <span>Matches</span>
                  </article>
                  <div className="admin-user-view-modal__actions">
                  <button
                    type="button"
                    className="admin-user-view-modal__view-quiz admin-user-view-modal__view-quiz--posts"
                    onClick={() => {
                      setActivityModalTab('posts');
                      setSelectedViewedUser(null);
                      setActivityModalUser(selectedViewedUser);
                    }}
                  >
                    View Posts
                  </button>
                  </div>
                </div>
                <div className="admin-user-view-modal__body">
                  <section className="admin-user-view-modal__panel">
                    <h5>Profile Information</h5>
                    <ul>
                      <li>
                        <span>Plan</span>
                        <strong>{selectedViewedUser.plan}</strong>
                      </li>
                      <li>
                        <span>Age</span>
                        <strong>{selectedViewedUser.age}</strong>
                      </li>
                      <li>
                        <span>Gender</span>
                        <strong>{selectedViewedUser.gender}</strong>
                      </li>
                      <li>
                        <span>Total Matches</span>
                        <strong>{selectedViewedUser.matches}</strong>
                      </li>
                      <li>
                        <span>Last Seen</span>
                        <strong>{selectedViewedUser.lastSeen}</strong>
                      </li>
                    </ul>
                  </section>
                  <section className="admin-user-view-modal__panel">
                    <h5>Quiz Information</h5>
                    <ul>
                      <li>
                        <span>Completion</span>
                        <strong>{selectedViewedUser.quizCompletion}%</strong>
                      </li>
                      <li>
                        <span>Interested In</span>
                        <strong>{selectedViewedUser.gender === 'Female' ? 'Men' : 'Women'}</strong>
                      </li>
                      <li>
                        <span>Age Preference</span>
                        <strong>
                          {selectedViewedUser.age != null
                            ? `${Math.max(18, selectedViewedUser.age - 5)}-${selectedViewedUser.age + 5}`
                            : '—'}
                        </strong>
                      </li>
                      <li>
                        <span>Relationship Goal</span>
                        <strong>{selectedViewedUser.plan === 'Platinum' ? 'Serious dating' : 'Open to connect'}</strong>
                      </li>
                      <li>
                        <span>Top Interests</span>
                        <strong>{selectedViewedUser.plan === 'Platinum' ? 'Travel, Fitness, Music' : 'Movies, Coffee, Chat'}</strong>
                      </li>
                    </ul>
                  </section>
                </div>
              </article>
            </div>
          )}
          {selectedPlanUser && (
            <div className="admin-plan-modal" role="dialog" aria-modal="true" aria-label="User subscription plan details">
              <button type="button" className="admin-plan-modal__backdrop" onClick={() => setSelectedPlanUser(null)} />
              <article className="admin-plan-modal__card">
                <header className="admin-plan-modal__head">
                  <div>
                    <h4>{selectedPlanUser.name} subscription</h4>
                    <p>Current plan: {selectedPlanUser.plan}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedPlanUser(null)} aria-label="Close subscription details">
                    ×
                  </button>
                </header>

                {selectedPlanUser.plan === 'Platinum' ? (
                  <>
                    <section className="admin-plan-modal__plans">
                      {PLATINUM_PLANS.map((plan) => (
                        <article key={plan.id} className={plan.popular ? 'is-popular' : ''}>
                          <strong>{plan.label}</strong>
                          <p>
                            {plan.price} <span>{plan.period}</span>
                          </p>
                          {plan.badge && <em>{plan.badge}</em>}
                        </article>
                      ))}
                    </section>
                    <ul className="admin-plan-modal__features">
                      {PLATINUM_FEATURES.slice(0, 6).map((feature) => (
                        <li key={feature.id}>{feature.title}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <section className="admin-plan-modal__free">
                    <h5>Free mode package</h5>
                    <ul>
                      <li>Limited daily likes and swipes</li>
                      <li>Basic profile visibility</li>
                      <li>Standard matching queue</li>
                      <li>Core messaging access</li>
                      <li>Upgrade path to Platinum anytime</li>
                    </ul>
                  </section>
                )}
              </article>
            </div>
          )}
          {quizModalUser && (
            <div className="admin-quiz-modal" role="dialog" aria-modal="true" aria-label="Quiz answers">
              <button type="button" className="admin-quiz-modal__backdrop" onClick={() => setQuizModalUser(null)} />
              <article className="admin-quiz-modal__card">
                <header>
                  <h4>{quizModalUser.name} quiz answers</h4>
                  <button type="button" onClick={() => setQuizModalUser(null)} aria-label="Close quiz answers">
                    ×
                  </button>
                </header>
                <ul>
                  {quizModalUser.quizAnswers.map((item, index) => (
                    <li key={item.question}>
                      <p>
                        <span>Q{index + 1}.</span> {item.question}
                      </p>
                      <strong>{item.answer}</strong>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          )}
          {activityModalUser && (
            <div className="admin-activity-modal" role="dialog" aria-modal="true" aria-label="Posts and meetings">
              <button type="button" className="admin-activity-modal__backdrop" onClick={() => setActivityModalUser(null)} />
              <article className="admin-activity-modal__card">
                <header>
                  <h4>{activityModalUser.name} activity</h4>
                  <button type="button" onClick={() => setActivityModalUser(null)} aria-label="Close activity">
                    ×
                  </button>
                </header>
                <div className="admin-activity-modal__tabs">
                  <button
                    type="button"
                    className={activityModalTab === 'posts' ? 'is-active' : ''}
                    onClick={() => setActivityModalTab('posts')}
                  >
                    Posts
                  </button>
                  <button
                    type="button"
                    className={activityModalTab === 'meetings' ? 'is-active' : ''}
                    onClick={() => setActivityModalTab('meetings')}
                  >
                    Meetings
                  </button>
                </div>
                {activityModalTab === 'posts' ? (
                  <section>
                    <h5>Posts</h5>
                    <div className="admin-activity-modal__posts-grid">
                      {activityModalUser.posts.slice(0, 6).map((src, index) => (
                        <article key={`${activityModalUser.id}-post-${index}`} className="admin-activity-modal__post-card">
                          <img src={src} alt="" />
                          <button
                            type="button"
                            className="admin-activity-modal__post-menu-trigger"
                            onClick={() =>
                              setActivePostMenuId((prev) =>
                                prev === `${activityModalUser.id}-post-${index}` ? null : `${activityModalUser.id}-post-${index}`,
                              )
                            }
                            aria-label="Post moderation options"
                          >
                            ⋯
                          </button>
                          {activePostMenuId === `${activityModalUser.id}-post-${index}` && (
                            <div className="admin-activity-modal__post-menu">
                              <button
                                type="button"
                                onClick={() => {
                                  setPostModerationNotice('Warning sent to user for this post.');
                                  setActivePostMenuId(null);
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                  <path d="M12 3l9 16H3L12 3z" />
                                  <path d="M12 9v4M12 16h.01" />
                                </svg>
                                Warn user
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPostModerationNotice('Post removed by admin moderation.');
                                  setActivePostMenuId(null);
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                  <path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12" />
                                </svg>
                                Delete post
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPostModerationNotice('Post hidden from public feed.');
                                  setActivePostMenuId(null);
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                                  <path d="M4 20L20 4" />
                                </svg>
                                Hide from feed
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPostModerationNotice('Escalated to Trust & Safety queue.');
                                  setActivePostMenuId(null);
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                  <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                                  <path d="M9 12l2 2 4-4" />
                                </svg>
                                Escalate review
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                    {postModerationNotice && <p>{postModerationNotice}</p>}
                  </section>
                ) : (
                  <section>
                    <h5>Date Meetings</h5>
                    {activityModalUser.meetings?.length ? (
                      <div className="admin-activity-modal__meetings">
                        {activityModalUser.meetings.map((meeting, index) => {
                          const [title, timeLabel] = meeting.split(' - ');
                          const date: OnlineDate = {
                            id: `${activityModalUser.handle}-meeting-${index}`,
                            title,
                            topic: timeLabel ?? 'Scheduled meetup',
                            hostName: activityModalUser.name,
                            hostAvatar: activityModalUser.avatarUrl ?? APP_IMAGES.logo,
                            status: 'scheduled',
                            visibility: 'private',
                            accessCode: `LVY${(index + 1).toString().padStart(3, '0')}`,
                            participantCount: 2,
                            maxParticipants: 2,
                            startsInMinutes: 45 + index * 15,
                            coverImage:
                              index % 2 === 0
                                ? pickMockFeedImage(2)
                                : pickMockFeedImage(3),
                            tags: ['dating', 'vibes'],
                          };
                          return (
                            <div key={date.id} className="admin-activity-modal__meeting-admin-card">
                              <OnlineDateCard
                                date={date}
                                isJoining={joiningMeetingId === date.id}
                                onJoin={() => {
                                  setJoiningMeetingId(date.id);
                                  window.sessionStorage.setItem('lavey:adminTargetNav', 'rooms');
                                  storePendingMeetupCode(date.accessCode);
                                  onNavigate('/');
                                }}
                                onCopyCode={(code) => setCopiedMeetingCode(code)}
                                onCopyLink={(link) => void navigator.clipboard?.writeText(link)}
                              />
                              <div className="admin-activity-modal__meeting-actions">
                                <button
                                  type="button"
                                  onClick={() => setMeetingModerationNotice(`Meeting "${date.title}" opened for edit.`)}
                                >
                                  Edit meeting
                                </button>
                                <button
                                  type="button"
                                  className="is-danger"
                                  onClick={() => setMeetingModerationNotice(`Meeting "${date.title}" deleted by admin.`)}
                                >
                                  Delete meeting
                                </button>
                                <button
                                  type="button"
                                  className="is-warning"
                                  onClick={() => setMeetingModerationNotice(`Meeting "${date.title}" reported for review.`)}
                                >
                                  Report meeting
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p>No date meetings scheduled.</p>
                    )}
                    {copiedMeetingCode && <p>Copied room code: {copiedMeetingCode}</p>}
                    {meetingModerationNotice && <p>{meetingModerationNotice}</p>}
                  </section>
                )}
              </article>
            </div>
          )}
        </section>
      );
    }

    if (activeSection === 'comms') {
      return <AdminSupportInbox />;
    }

    if (activeSection === 'ai') {
      return (
        <section className="admin-ai-overseer-shell">
          <AdminAlgorithmOverseer />
        </section>
      );
    }

    if (activeSection === 'experiments') {
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
                <strong>94,320</strong>
              </article>
              <article>
                <span>Avg time on platform</span>
                <strong>6.3h</strong>
              </article>
            </div>
          </header>

          <AdminExperimentAnalytics />
        </section>
      );
    }

    if (activeSection === 'content') {
      const queueStats = { ai: 86, human: 24, reports: 31, appeals: 9, fakeProfiles: 14 };

      const reviewQueue = [
        ...contentReviewUsers.flatMap((user) =>
          user.posts.slice(0, 1).map((thumb, postIndex) => ({
            id: `post-${user.id}-${postIndex}`,
            type: 'posts' as const,
            user: user.name,
            handle: user.handle,
            thumb,
            preview: `${user.name} shared a new post`,
            flags: user.subscribed ? ['subscribed member'] : ['member'],
            aiScore: user.quizCompletion ?? 72,
          })),
        ),
        ...contentReviewUsers
          .filter((user) => user.avatarUrl)
          .slice(0, 8)
          .map((user) => ({
            id: `photo-${user.id}`,
            type: 'photos' as const,
            user: user.name,
            handle: user.handle,
            thumb: user.avatarUrl ?? APP_IMAGES.logo,
            preview: 'Profile photo update pending review',
            flags: user.subscribed ? ['subscribed', 'needs review'] : ['needs review'],
            aiScore: user.quizCompletion ?? 68,
          })),
      ];

      const reportedItems = [
        {
          id: 'rep-1',
          type: 'photos',
          user: '@unknown_za_92',
          reason: 'Explicit profile photo',
          severity: 'critical',
          reports: 17,
          age: '12m ago',
        },
        {
          id: 'rep-2',
          type: 'messages',
          user: '@bobjohnson',
          reason: 'Harassment in chat after match',
          severity: 'high',
          reports: 9,
          age: '34m ago',
        },
        {
          id: 'rep-3',
          type: 'bios',
          user: '@scamwatch_alert',
          reason: 'Bio asks for money / off-platform payment',
          severity: 'high',
          reports: 14,
          age: '1h ago',
        },
        {
          id: 'rep-4',
          type: 'posts',
          user: '@claragarcia',
          reason: 'Misleading photos / catfish concern',
          severity: 'medium',
          reports: 6,
          age: '2h ago',
        },
        {
          id: 'rep-5',
          type: 'meetings',
          user: '@alicesmith',
          reason: 'Unsafe behavior in video date room',
          severity: 'critical',
          reports: 11,
          age: '22m ago',
        },
      ];

      const typeLabel: Record<string, string> = {
        photos: 'Profile photo',
        posts: 'Post',
        bios: 'Bio',
        messages: 'Chat message',
        meetings: 'Date meeting',
      };

      const filteredQueue = reviewQueue.filter((item) => {
          if (!contentSearch.trim()) return true;
          const q = contentSearch.toLowerCase();
          return (
            item.user.toLowerCase().includes(q) ||
            item.handle.toLowerCase().includes(q) ||
            item.preview.toLowerCase().includes(q)
          );
        });

      const filteredReports = reportedItems.filter((item) => {
          if (!contentSearch.trim()) return true;
          const q = contentSearch.toLowerCase();
          return item.user.toLowerCase().includes(q) || item.reason.toLowerCase().includes(q);
        });

      return (
        <section className="admin-content-moderation">
          <header className="admin-content-moderation__head">
            <div>
              <h3>Content Moderation</h3>
              <p>
                Review Lavey dating content — profile photos, posts, bios, chats, and date meetings — before it reaches
                Discover.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setContentActionNotice('Moderation policy saved for Discover and profile review.')}
            >
              Save Moderation Policy
            </button>
          </header>

          <div className="admin-content-moderation__stats">
            <article>
              <p>AI pre-screen queue</p>
              <strong>{queueStats.ai}</strong>
            </article>
            <article>
              <p>Human review queue</p>
              <strong>{queueStats.human}</strong>
            </article>
            <article>
              <p>User reports</p>
              <strong>{queueStats.reports}</strong>
            </article>
            <article>
              <p>Appeals waiting</p>
              <strong>{queueStats.appeals}</strong>
            </article>
            <article>
              <p>Suspected fake profiles</p>
              <strong>{queueStats.fakeProfiles}</strong>
            </article>
          </div>

          <div className="admin-content-moderation__toolbar">
            <input
              type="text"
              placeholder="Search user, handle, report reason..."
              value={contentSearch}
              onChange={(e) => setContentSearch(e.target.value)}
            />
          </div>

          <div className="admin-content-moderation__grid">
            <article className="admin-content-moderation__card admin-content-moderation__card--queue">
              <h4>Review Queue</h4>
              <div className="admin-content-moderation__queue-grid">
                {filteredQueue.map((item) => (
                  <div key={item.id} className="admin-content-moderation__queue-card">
                    <div className="admin-content-moderation__thumb">
                      <img
                        src={item.thumb}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = APP_IMAGES.logo;
                        }}
                      />
                      <span>{typeLabel[item.type]}</span>
                    </div>
                    <div className="admin-content-moderation__queue-body">
                      <strong>
                        {item.user} · {item.handle}
                      </strong>
                      <p>{item.preview}</p>
                      <div className="admin-content-moderation__flags">
                        {item.flags.map((flag) => (
                          <span key={flag}>{flag}</span>
                        ))}
                        <span className="admin-content-moderation__score">AI score {item.aiScore}</span>
                      </div>
                      <div className="admin-content-moderation__queue-actions">
                        <button
                          type="button"
                          onClick={() => setContentActionNotice(`Approved ${typeLabel[item.type]} for ${item.handle}`)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => setContentActionNotice(`Removed ${typeLabel[item.type]} for ${item.handle}`)}
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          className="admin-content-moderation__menu-btn"
                          onClick={() =>
                            setActiveContentMenuId((prev) => (prev === item.id ? null : item.id))
                          }
                        >
                          More
                        </button>
                        {activeContentMenuId === item.id && (
                          <div className="admin-content-moderation__menu">
                            <button
                              type="button"
                              className="admin-content-moderation__menu-close"
                              onClick={() => setActiveContentMenuId(null)}
                              aria-label="Close menu"
                            >
                              ×
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setContentActionNotice(`Warning sent to ${item.handle}`);
                                setActiveContentMenuId(null);
                              }}
                            >
                              Warn user
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setContentActionNotice(`Hidden from Discover: ${item.handle}`);
                                setActiveContentMenuId(null);
                              }}
                            >
                              Hide from Discover
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setContentActionNotice(`Escalated ${item.handle} to Trust & Safety`);
                                setActiveContentMenuId(null);
                              }}
                            >
                              Escalate
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!filteredQueue.length && (
                  <p className="admin-content-moderation__empty">No items match your search.</p>
                )}
              </div>
            </article>

            <article className="admin-content-moderation__card">
              <h4>Reported by Members</h4>
              <ul className="admin-content-moderation__report-list">
                {filteredReports.map((item) => (
                  <li
                    key={item.id}
                    className={`admin-content-moderation__report admin-content-moderation__report--${item.severity}`}
                  >
                    <div>
                      <strong>
                        {typeLabel[item.type]} · {item.user}
                      </strong>
                      <span>{item.reason}</span>
                    </div>
                    <div className="admin-content-moderation__report-meta">
                      <span
                        className={`admin-content-moderation__severity admin-content-moderation__severity--${item.severity}`}
                      >
                        {item.severity}
                      </span>
                      <span>{item.reports} reports</span>
                      <span>{item.age}</span>
                    </div>
                    <div className="admin-content-moderation__report-actions">
                      <button
                        type="button"
                        onClick={() => setContentActionNotice(`Restricted messaging for ${item.user}`)}
                      >
                        Restrict chat
                      </button>
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => setContentActionNotice(`Banned ${item.user}`)}
                      >
                        Ban account
                      </button>
                      <button type="button" onClick={() => setContentActionNotice(`Escalated report ${item.id}`)}>
                        Escalate
                      </button>
                    </div>
                  </li>
                ))}
                {!filteredReports.length && (
                  <li className="admin-content-moderation__empty">No reports match your search.</li>
                )}
              </ul>
            </article>

            <article className="admin-content-moderation__card">
              <h4>Enforcement Actions</h4>
              <div className="admin-content-moderation__actions-grid">
                <button type="button" onClick={() => setContentActionNotice('Post hidden from Discover feed.')}>
                  Hide from Discover
                </button>
                <button type="button" onClick={() => setContentActionNotice('Profile hidden from matching.')}>
                  Hide profile
                </button>
                <button type="button" onClick={() => setContentActionNotice('Chat restricted for 7 days.')}>
                  Restrict chat
                </button>
                <button type="button" onClick={() => setContentActionNotice('Meeting room access suspended.')}>
                  Suspend meetings
                </button>
                <button type="button" onClick={() => setContentActionNotice('Verification required before re-posting.')}>
                  Require verification
                </button>
                <button type="button" className="is-danger" onClick={() => setContentActionNotice('Account banned.')}>
                  Ban account
                </button>
              </div>
            </article>
          </div>

          {contentActionNotice && <p className="admin-content-moderation__notice">{contentActionNotice}</p>}
        </section>
      );
    }

    if (activeSection === 'monetization') {
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
        setMonetizationWallets((prev) => {
          const target = prev.find((wallet) => wallet.id === walletId);
          if (target) {
            setMonetizationNotice(
              target.withdrawEnabled
                ? `Withdraw disabled for ${target.name}.`
                : `Withdraw enabled for ${target.name}.`,
            );
          }
          return prev.map((wallet) =>
            wallet.id === walletId ? { ...wallet, withdrawEnabled: !wallet.withdrawEnabled } : wallet,
          );
        });
      };

      const sendGift = () => {
        if (!giftPanelUser) return;
        const amount = Math.max(1, Number(giftAmount) || 0);
        setMonetizationWallets((prev) =>
          prev.map((wallet) =>
            wallet.id === giftPanelUser.id
              ? {
                  ...wallet,
                  giftBalance: wallet.giftBalance + amount,
                  wasGifted: true,
                  lastGiftAt: 'Just now',
                }
              : wallet,
          ),
        );
        setMonetizationNotice(`Gift of R${amount.toLocaleString()} sent to ${giftPanelUser.name}. They have been marked as gifted.`);
        setGiftPanelUserId(null);
        setGiftAmount('100');
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
                {filteredWallets.map((wallet) => (
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
                {!filteredWallets.length && (
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
      aria-label={side === 'left' ? 'Admin navigation' : 'Admin quick navigation'}
    >
      <div className="admin-dash-v2__rail-brand">
        <img src={APP_IMAGES.logo} alt="" />
        <strong>Lavey</strong>
      </div>
      <nav className="admin-dash-v2__rail-nav">
        {MODULES.map((item) => (
          <button
            key={`${side}-${item.id}`}
            type="button"
            className={`admin-dash-v2__rail-item ${activeSection === item.id ? 'admin-dash-v2__rail-item--active' : ''}`}
            onClick={() => switchSection(item.id)}
          >
            <span className="admin-dash-v2__rail-icon" aria-hidden>
              <MenuIcon kind={item.icon} />
            </span>
            <span className="admin-dash-v2__rail-label">{item.label}</span>
          </button>
        ))}
      </nav>
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
          <button type="button" className="admin-dash-v2__rail-item" aria-label="Settings">
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
            <p className="admin-dash-v2__topbar-title">{activeModule.label}</p>
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
              <button type="button" className="admin-dash-v2__topbar-btn admin-dash-v2__topbar-btn--bell" aria-label="Notifications">
                <MenuIcon kind="bell" />
                <span className="admin-dash-v2__topbar-dot" aria-hidden />
              </button>
              <time className="admin-dash-v2__topbar-date" dateTime={new Date().toISOString()}>
                {formatAdminHeaderDate()}
              </time>
            </div>
          </header>

          <div className="admin-dash-v2__content">
            <header className="admin-dash-v2__page-head">
              <div>
                <p className="admin-dash-v2__breadcrumb">{sectionBreadcrumb(activeSection)}</p>
                <h1>{activeModule.label}</h1>
                <p className="admin-dash-v2__page-sub">{activeModule.summary}</p>
              </div>
              {activeSection === 'users' && (
                <button type="button" className="admin-dash-v2__primary-btn">
                  + Add user
                </button>
              )}
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
