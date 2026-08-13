import { TOOL_PAGE_META } from '@/features/admin/components/AdminQuickToolsPanel/adminToolTypes';

export const ADMIN_PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'upload'] as const;

const PRIMARY_NAVIGATION = [
  { id: 'command', label: 'Overview', menu: 'Main navigation' },
  { id: 'users', label: 'User management', menu: 'Main navigation' },
  { id: 'verification', label: 'Verification requests', menu: 'Main navigation' },
  { id: 'content', label: 'Content control', menu: 'Main navigation' },
  { id: 'comms', label: 'Communication hub', menu: 'Main navigation' },
  { id: 'monetization', label: 'Monetization lab', menu: 'Main navigation' },
  { id: 'experiments', label: 'Experimentation lab', menu: 'Main navigation' },
  { id: 'marketing', label: 'Website marketing', menu: 'Main navigation' },
  { id: 'ai', label: 'AI overseer', menu: 'Main navigation' },
  { id: 'settings', label: 'Settings', menu: 'Account' },
] as const;

/**
 * Permission rows are generated from the same quick-tool metadata used by the
 * dashboard navigation. New quick tools therefore appear here automatically.
 */
export const ADMIN_PERMISSION_PAGES = [
  ...PRIMARY_NAVIGATION,
  ...TOOL_PAGE_META.map((tool) => ({
    id: tool.id,
    label: tool.label,
    menu: ['employees', 'roles-pay', 'leaves', 'invoices', 'claims'].includes(tool.id)
      ? 'People & HR'
      : 'Shortcuts & alerts',
  })),
];
