export type QuickToolId =
  | 'notifications'
  | 'activity'
  | 'alerts'
  | 'broadcast'
  | 'export'
  | 'help'
  | 'employees'
  | 'roles-pay'
  | 'leaves'
  | 'claims';

export type HrQuickToolId = 'employees' | 'roles-pay' | 'leaves' | 'claims';

export type OpsToolId = Exclude<QuickToolId, HrQuickToolId>;

const OPS_TOOL_IDS: OpsToolId[] = ['notifications', 'activity', 'alerts', 'broadcast', 'export', 'help'];

const HR_TOOL_IDS: HrQuickToolId[] = ['employees', 'roles-pay', 'leaves', 'claims'];

export function isQuickToolView(id: string): id is QuickToolId {
  return (OPS_TOOL_IDS as string[]).includes(id) || (HR_TOOL_IDS as string[]).includes(id);
}

export function isHrQuickTool(id: string): id is HrQuickToolId {
  return (HR_TOOL_IDS as string[]).includes(id);
}

export function isOpsQuickTool(id: string): id is OpsToolId {
  return (OPS_TOOL_IDS as string[]).includes(id);
}

export function hrTabFromTool(id: HrQuickToolId): 'employees' | 'roles' | 'leaves' | 'claims' {
  if (id === 'roles-pay') return 'roles';
  if (id === 'leaves') return 'leaves';
  if (id === 'claims') return 'claims';
  return 'employees';
}

export interface ToolPageMeta {
  id: QuickToolId;
  label: string;
  sub: string;
  icon: string;
  summary: string;
  breadcrumb: string;
}

export const TOOL_PAGE_META: ToolPageMeta[] = [
  {
    id: 'notifications',
    label: 'Notifications',
    sub: 'Queues & inbox',
    icon: 'bell',
    summary: 'Moderation queue, member reports, and unread support messages in one place.',
    breadcrumb: 'Admin / Notifications',
  },
  {
    id: 'activity',
    label: 'Activity log',
    sub: 'Recent events',
    icon: 'activity',
    summary: 'Live platform and admin activity across Discover, moderation, and support.',
    breadcrumb: 'Admin / Activity log',
  },
  {
    id: 'alerts',
    label: 'System alerts',
    sub: 'Safety & health',
    icon: 'shield',
    summary: 'Safety escalations and items that need immediate admin attention.',
    breadcrumb: 'Admin / System alerts',
  },
  {
    id: 'broadcast',
    label: 'Push broadcast',
    sub: 'Announcements',
    icon: 'megaphone',
    summary: 'Send push or in-app announcements to member segments.',
    breadcrumb: 'Admin / Push broadcast',
  },
  {
    id: 'export',
    label: 'Data export',
    sub: 'CSV snapshots',
    icon: 'download',
    summary: 'Download CSV snapshots for members, moderation, support, and algorithms.',
    breadcrumb: 'Admin / Data export',
  },
  {
    id: 'help',
    label: 'Help center',
    sub: 'Admin guides',
    icon: 'help',
    summary: 'Workflow guides for moderation, AI Overseer, user enforcement, and support.',
    breadcrumb: 'Admin / Help center',
  },
  {
    id: 'employees',
    label: 'Employees',
    sub: 'Add & manage staff',
    icon: 'team',
    summary: 'Add team members, assign roles, and track employment status and leave balances.',
    breadcrumb: 'Admin / HR / Employees',
  },
  {
    id: 'roles-pay',
    label: 'Roles',
    sub: 'Permissions & access',
    icon: 'badge',
    summary: 'Define job roles, departments, and what each role can access in the admin panel.',
    breadcrumb: 'Admin / HR / Roles',
  },
  {
    id: 'leaves',
    label: 'Leave',
    sub: 'Time off & remote work',
    icon: 'calendar',
    summary: 'Submit and approve annual, sick, family, and unpaid leave plus remote work requests.',
    breadcrumb: 'Admin / HR / Leave',
  },
  {
    id: 'claims',
    label: 'Claims',
    sub: 'Expenses & reimbursements',
    icon: 'clipboard',
    summary: 'Employee expense claims, equipment, training costs, and company-wide spend.',
    breadcrumb: 'Admin / HR / Claims',
  },
];

export function getToolPageMeta(id: QuickToolId): ToolPageMeta {
  return TOOL_PAGE_META.find((tool) => tool.id === id) ?? TOOL_PAGE_META[0]!;
}
