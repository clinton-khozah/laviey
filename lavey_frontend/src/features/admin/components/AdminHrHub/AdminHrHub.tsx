import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminHrService,
  isExpenseClaimType,
  isLeaveClaimType,
  type ClaimStatus,
  type ClaimType,
  type CompanyHoliday,
  type Employee,
  type EmployeeClaim,
  type EmployeeRole,
  type EmploymentStatus,
  type Department,
  type HrDocumentAnalysis,
  type HrOverview,
} from '@/services/admin/adminHrService';
import './AdminHrHub.css';
import { AdminHolidayCalendar } from '../AdminHolidayCalendar/AdminHolidayCalendar';
import {
  adminCompanySubscriptionsService,
  type CompanyInvoice,
} from '@/services/admin/adminCompanySubscriptionsService';
import { adminAccessService, type AdminOperator } from '@/services/admin/adminAccessService';
import { ADMIN_PERMISSION_ACTIONS, ADMIN_PERMISSION_PAGES } from './adminPermissionCatalog';
import { AdminConfirmDialog, AdminHeartLoader, AdminNotificationModal } from '../AdminFeedback';
import { LogoLoader } from '@/components/ui/LogoLoader';

export type HrTab = 'employees' | 'roles' | 'access' | 'leaves' | 'claims';

interface AdminHrHubProps {
  initialTab: HrTab;
  openExpenseUpload?: boolean;
  onPendingCountsChange?: (counts: { leaves: number; claims: number }) => void;
  onOpenSupport?: () => void;
  onOpenModeration?: () => void;
}

const HR_TABS: { id: HrTab; label: string }[] = [
  { id: 'employees', label: 'Employees' },
  { id: 'roles', label: 'Roles' },
  { id: 'access', label: 'Admin access' },
  { id: 'leaves', label: 'Leave' },
  { id: 'claims', label: 'Claims' },
];

const LEAVE_TYPES: { id: ClaimType; label: string }[] = [
  { id: 'annual_leave', label: 'Annual leave' },
  { id: 'sick_leave', label: 'Sick leave' },
  { id: 'family_leave', label: 'Family leave' },
  { id: 'unpaid_leave', label: 'Unpaid leave' },
  { id: 'remote_work', label: 'Remote work' },
];

const EXPENSE_TYPES: { id: ClaimType; label: string }[] = [
  { id: 'expense', label: 'Employee expense' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'training', label: 'Training' },
  { id: 'company_expense', label: 'Company expense' },
  { id: 'other', label: 'Other spend' },
];

const ALL_REQUEST_TYPES = [...LEAVE_TYPES, ...EXPENSE_TYPES];


const DEPARTMENT_TONES: Record<string, string> = {
  Executive: 'executive',
  Operations: 'operations',
  Product: 'product',
  Engineering: 'engineering',
  'Cyber Security': 'security',
  'People & HR': 'hr',
  Marketing: 'marketing',
  'Trust & Safety': 'safety',
  Support: 'support',
};

function departmentTone(department: string): string {
  return DEPARTMENT_TONES[department] ?? 'default';
}

function permissionTone(perm: string): string {
  if (perm === 'moderation') return 'red';
  if (perm === 'billing') return 'green';
  if (perm === 'algorithms' || perm === 'experiments') return 'purple';
  if (perm === 'hr') return 'amber';
  return 'blue';
}

function RoleIconButton({
  label,
  kind,
  onClick,
}: {
  label: string;
  kind: 'view' | 'edit' | 'delete';
  onClick: () => void;
}) {
  return (
    <button type="button" className={`admin-hr-hub__role-action admin-hr-hub__role-action--${kind}`} aria-label={label} title={label} onClick={onClick}>
      {kind === 'view' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : null}
      {kind === 'edit' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      ) : null}
      {kind === 'delete' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      ) : null}
    </button>
  );
}

type RoleFormState = {
  name: string;
  description: string;
  department: string;
  permissions: string[];
  accessRules: Record<string, string[]>;
};

const emptyRoleForm = (): RoleFormState => ({
  name: '',
  description: '',
  department: 'Operations',
  permissions: [],
  accessRules: {},
});

function formatMoney(amount: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function claimTypeLabel(type: ClaimType): string {
  return ALL_REQUEST_TYPES.find((t) => t.id === type)?.label ?? type.replace(/_/g, ' ');
}

function statusClass(status: ClaimStatus | EmploymentStatus): string {
  return status.replace('_', '-');
}

function HrKpiIcon({ kind }: { kind: 'team' | 'active' | 'leave' | 'claims' | 'payroll' }) {
  if (kind === 'active') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    );
  }
  if (kind === 'leave') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }
  if (kind === 'claims') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    );
  }
  if (kind === 'payroll') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
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

function documentHintForClaimType(claimType: ClaimType): string {
  switch (claimType) {
    case 'expense':
      return 'Upload a tax invoice or receipt — AI will extract the amount, vendor, and dates.';
    case 'equipment':
      return 'Upload a purchase invoice or quotation for the equipment request.';
    case 'training':
      return 'Upload a course invoice or registration confirmation.';
    case 'company_expense':
      return 'Upload a supplier invoice or receipt for company-wide spend.';
    default:
      return 'Upload an invoice or receipt — AI will read it and pre-fill what it can.';
  }
}

type ClaimFormState = {
  employeeId: string;
  claimType: ClaimType;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  daysRequested: string;
  amount: string;
};

const emptyLeaveForm = (): ClaimFormState => ({
  employeeId: '',
  claimType: 'annual_leave',
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  daysRequested: '',
  amount: '',
});

const emptyExpenseForm = (): ClaimFormState => ({
  employeeId: '',
  claimType: 'expense',
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  daysRequested: '',
  amount: '',
});

function applyDocumentExtraction(analysis: HrDocumentAnalysis, current: ClaimFormState): ClaimFormState {
  const { extracted } = analysis;
  const parts = [extracted.description, extracted.vendor, extracted.invoiceNumber ? `Ref: ${extracted.invoiceNumber}` : '']
    .filter(Boolean)
    .join(' · ');

  return {
    ...current,
    title: extracted.title || current.title,
    description: parts || current.description,
    startDate: extracted.startDate || current.startDate,
    endDate: extracted.endDate || current.endDate,
    daysRequested:
      extracted.daysRequested !== undefined ? String(extracted.daysRequested) : current.daysRequested,
    amount: extracted.amount !== undefined ? String(extracted.amount) : current.amount,
  };
}

export function AdminHrHub({ initialTab, openExpenseUpload = false, onPendingCountsChange }: AdminHrHubProps) {
  const [tab, setTab] = useState<HrTab>(initialTab);
  const [overview, setOverview] = useState<HrOverview | null>(null);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showDepartmentCreator, setShowDepartmentCreator] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [claims, setClaims] = useState<EmployeeClaim[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [claimFilter, setClaimFilter] = useState<ClaimStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rolePendingDelete, setRolePendingDelete] = useState<EmployeeRole | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  const [employeePendingDelete, setEmployeePendingDelete] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [invitePendingDelete, setInvitePendingDelete] = useState<AdminOperator | null>(null);
  const [deletingInvite, setDeletingInvite] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showAddLeave, setShowAddLeave] = useState(false);
  const [showAddClaim, setShowAddClaim] = useState(false);

  const [empForm, setEmpForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    roleId: '',
    jobTitle: '',
    department: '',
    startDate: '',
    salary: '',
    leaveBalanceDays: '15',
  });

  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [roleModal, setRoleModal] = useState<{ mode: 'view' | 'edit'; role: EmployeeRole } | null>(null);
  const [editRoleForm, setEditRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [employeeModal, setEmployeeModal] = useState<Employee | null>(null);
  const [editEmpForm, setEditEmpForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    roleId: '',
    jobTitle: '',
    department: '',
    employmentStatus: 'active' as EmploymentStatus,
    startDate: '',
    salary: '',
    leaveBalanceDays: '',
    notes: '',
  });

  const [claimForm, setClaimForm] = useState<ClaimFormState>(emptyLeaveForm);
  const [claimDocument, setClaimDocument] = useState<File | null>(null);
  const [claimDocumentPreview, setClaimDocumentPreview] = useState('');
  const [claimDocumentAnalysis, setClaimDocumentAnalysis] = useState<HrDocumentAnalysis | null>(null);
  const [claimDocumentLoading, setClaimDocumentLoading] = useState(false);
  const [companyInvoices, setCompanyInvoices] = useState<CompanyInvoice[]>([]);
  const [operators, setOperators] = useState<AdminOperator[]>([]);
  const [showInviteOperator, setShowInviteOperator] = useState(false);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', roleId: '' });
  const [claimInvoiceSource, setClaimInvoiceSource] = useState<'internal' | 'external'>('internal');
  const [selectedCompanyInvoiceId, setSelectedCompanyInvoiceId] = useState('');

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [ov, roleList, empList, claimList, invoiceList, operatorList, departmentList, holidayList] = await Promise.all([
        adminHrService.getOverview(),
        adminHrService.listRoles(),
        adminHrService.listEmployees(),
        adminHrService.listClaims(),
        adminCompanySubscriptionsService.listInvoices().catch(() => []),
        adminAccessService.listOperators().catch(() => []),
        adminHrService.listDepartments().catch(() => []),
        adminHrService.listHolidays().catch(() => []),
      ]);
      setOverview(ov);
      setRoles(roleList);
      setEmployees(empList);
      setClaims(claimList);
      setCompanyInvoices(invoiceList.filter((invoice) => invoice.status === 'submitted'));
      setOperators(operatorList);
      setHolidays(holidayList);
      setDepartments(departmentList.length ? departmentList : Array.from(new Set(roleList.map((role) => role.department))).sort().map((name) => ({ id: name, name, description: '', isActive: true })));
      if (!inviteForm.roleId && roleList[0]) setInviteForm((current) => ({ ...current, roleId: roleList[0]!.id }));
      onPendingCountsChange?.({ leaves: ov.pendingLeaves, claims: ov.pendingClaims });
      if (!empForm.roleId && roleList[0]) {
        setEmpForm((f) => ({ ...f, roleId: roleList[0]!.id }));
      }
      if (!claimForm.employeeId && empList[0]) {
        setClaimForm((f) => ({ ...f, employeeId: empList[0]!.id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load HR data');
    } finally {
      setLoading(false);
    }
  }, [onPendingCountsChange]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const filteredLeaves = useMemo(() => {
    const leaveOnly = claims.filter((c) => isLeaveClaimType(c.claimType));
    if (claimFilter === 'all') return leaveOnly;
    return leaveOnly.filter((c) => c.status === claimFilter);
  }, [claims, claimFilter]);

  const filteredExpenseClaims = useMemo(() => {
    const expenseOnly = claims.filter((c) => isExpenseClaimType(c.claimType));
    if (claimFilter === 'all') return expenseOnly;
    return expenseOnly.filter((c) => c.status === claimFilter);
  }, [claims, claimFilter]);

  const employeeDepartmentOptions = useMemo(
    () => Array.from(new Set(
      roles.map((role) => role.department.trim()).filter(Boolean),
    )).sort((a, b) => a.localeCompare(b)),
    [roles],
  );

  const flash = (message: string) => {
    setNotice(message);
    globalThis.setTimeout(() => setNotice(''), 5000);
  };

  const handleAddEmployee = async () => {
    if (!empForm.fullName.trim() || !empForm.email.trim() || !empForm.roleId || !empForm.salary) return;
    try {
      await adminHrService.createEmployee({
        fullName: empForm.fullName,
        email: empForm.email,
        phone: empForm.phone || undefined,
        roleId: empForm.roleId,
        jobTitle: empForm.jobTitle || undefined,
        department: empForm.department || undefined,
        startDate: empForm.startDate || undefined,
        salary: Number(empForm.salary),
        leaveBalanceDays: Number(empForm.leaveBalanceDays) || 15,
      });
      setShowAddEmployee(false);
      setEmpForm({
        fullName: '',
        email: '',
        phone: '',
        roleId: roles[0]?.id ?? '',
        jobTitle: '',
        department: '',
        startDate: '',
        salary: '',
        leaveBalanceDays: '15',
      });
      flash('Employee added successfully.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee');
    }
  };

  const openEmployeeEdit = (emp: Employee) => {
    setEmployeeModal(emp);
    setEditEmpForm({
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone ?? '',
      roleId: emp.roleId,
      jobTitle: emp.jobTitle ?? '',
      department: emp.department,
      employmentStatus: emp.employmentStatus,
      startDate: emp.startDate ?? '',
      salary: String(emp.salary),
      leaveBalanceDays: String(emp.leaveBalanceDays),
      notes: emp.notes ?? '',
    });
  };

  const handleUpdateEmployee = async () => {
    if (!employeeModal) return;
    try {
      await adminHrService.updateEmployee(employeeModal.id, {
        fullName: editEmpForm.fullName,
        email: editEmpForm.email,
        phone: editEmpForm.phone || undefined,
        roleId: editEmpForm.roleId,
        jobTitle: editEmpForm.jobTitle || undefined,
        department: editEmpForm.department || undefined,
        employmentStatus: editEmpForm.employmentStatus,
        startDate: editEmpForm.startDate || undefined,
        salary: Number(editEmpForm.salary),
        leaveBalanceDays: Number(editEmpForm.leaveBalanceDays) || 0,
        notes: editEmpForm.notes || undefined,
      });
      setEmployeeModal(null);
      flash('Employee updated.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    }
  };

  const handleAddRole = async () => {
    if (!roleForm.name.trim()) return;
    try {
      await adminHrService.createRole({
        name: roleForm.name,
        description: roleForm.description,
        department: roleForm.department,
        permissions: roleForm.permissions,
        accessRules: roleForm.accessRules,
      });
      setShowAddRole(false);
      setRoleForm(emptyRoleForm());
      flash('Role created.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
    }
  };

  const confirmDeleteEmployee = async () => {
    if (!employeePendingDelete) return;
    const employee = employeePendingDelete;
    setDeletingEmployee(true);
    try {
      await adminHrService.deleteEmployee(employee.id);
      if (employeeModal?.id === employee.id) setEmployeeModal(null);
      setEmployeePendingDelete(null);
      flash('Employee deleted.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
    } finally {
      setDeletingEmployee(false);
    }
  };

  const handleInviteOperator = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim() || !inviteForm.roleId) return;
    try {
      const result = await adminAccessService.inviteOperator(inviteForm);
      setInviteForm({ name: '', email: '', roleId: roles[0]?.id ?? '' });
      setShowInviteOperator(false);
      flash(result.emailSent ? 'Onboarding invitation emailed.' : 'Invitation created. Email delivery is not configured.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not invite admin user.');
    }
  };

  const confirmDeleteInvite = async () => {
    if (!invitePendingDelete) return;
    const invite = invitePendingDelete;
    setDeletingInvite(true);
    try {
      await adminAccessService.cancelInvite(invite.id);
      setInvitePendingDelete(null);
      flash(`Invitation for ${invite.name} deleted.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete invitation.');
    } finally {
      setDeletingInvite(false);
    }
  };

  const handleResendInvite = async (operator: AdminOperator) => {
    setResendingInviteId(operator.id);
    try {
      const result = await adminAccessService.resendInvite(operator.id);
      flash(result.emailSent ? `New invitation emailed to ${operator.name}.` : `Invitation recreated for ${operator.name}. Email delivery is not configured.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend invitation.');
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    setCreatingDepartment(true);
    setError('');
    try {
      const created = await adminHrService.createDepartment({ name: newDepartmentName });
      setDepartments((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setRoleForm((current) => ({ ...current, department: created.name }));
      setEditRoleForm((current) => ({ ...current, department: created.name }));
      setNewDepartmentName('');
      setShowDepartmentCreator(false);
      if (!roleModal || roleModal.mode !== 'edit') setShowAddRole(true);
      flash('Department created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create department.');
    } finally {
      setCreatingDepartment(false);
    }
  };

  const closeDepartmentCreator = () => {
    setError('');
    setShowDepartmentCreator(false);
    if (!roleModal || roleModal.mode !== 'edit') setShowAddRole(true);
  };

  const openRoleView = (role: EmployeeRole) => {
    setRoleModal({ mode: 'view', role });
  };

  const openRoleEdit = (role: EmployeeRole) => {
    setEditRoleForm({
      name: role.name,
      description: role.description,
      department: role.department,
      permissions: [...role.permissions],
      accessRules: role.accessRules ?? {},
    });
    setRoleModal({ mode: 'edit', role });
  };

  const handleUpdateRole = async () => {
    if (!roleModal?.role || !editRoleForm.name.trim()) return;
    try {
      await adminHrService.updateRole(roleModal.role.id, {
        name: editRoleForm.name,
        description: editRoleForm.description,
        department: editRoleForm.department,
        permissions: editRoleForm.permissions,
        accessRules: editRoleForm.accessRules,
      });
      setRoleModal(null);
      flash('Role updated.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleDeleteRole = (role: EmployeeRole) => {
    if (role.employeeCount > 0) {
      setError(`"${role.name}" has ${role.employeeCount} employee(s). Reassign them before deleting.`);
      return;
    }
    setRolePendingDelete(role);
  };

  const confirmDeleteRole = async () => {
    if (!rolePendingDelete) return;
    const role = rolePendingDelete;
    setDeletingRole(true);
    try {
      await adminHrService.deleteRole(role.id);
      if (roleModal?.role.id === role.id) setRoleModal(null);
      setRolePendingDelete(null);
      flash('Role deleted.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
    } finally {
      setDeletingRole(false);
    }
  };

  const toggleAccessRule = (module: string, action: string) => {
    setEditRoleForm((current) => {
      const currentActions = current.accessRules[module] ?? [];
      return {
        ...current,
        accessRules: {
          ...current.accessRules,
          [module]: currentActions.includes(action)
            ? currentActions.filter((value) => value !== action)
            : [...currentActions, action],
        },
      };
    });
  };

  const resetClaimDocument = useCallback(() => {
    setClaimDocumentPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    setClaimDocument(null);
    setClaimDocumentAnalysis(null);
    setClaimDocumentLoading(false);
  }, []);

  useEffect(() => {
    if (!openExpenseUpload) return;
    setTab('claims');
    setShowAddLeave(false);
    setShowAddClaim(true);
    resetClaimDocument();
    setClaimForm((current) => ({
      ...emptyExpenseForm(),
      employeeId: employees[0]?.id ?? current.employeeId,
    }));
  }, [openExpenseUpload, employees, resetClaimDocument]);

  const analyzeClaimFile = useCallback(async (file: File, claimType: ClaimType) => {
    setClaimDocumentLoading(true);
    setError('');
    try {
      const analysis = await adminHrService.analyzeClaimDocument(file, claimType);
      setClaimDocumentAnalysis(analysis);
      setClaimForm((current) => applyDocumentExtraction(analysis, current));
      if (analysis.matchesClaimType) {
        flash('Document verified — fields updated from your upload.');
      } else {
        setError(analysis.matchReason || 'This document may not match the selected claim type.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze document');
    } finally {
      setClaimDocumentLoading(false);
    }
  }, []);

  const handleClaimDocument = async (file: File | null) => {
    resetClaimDocument();
    if (!file) return;
    setClaimDocument(file);
    setClaimDocumentPreview(URL.createObjectURL(file));
    await analyzeClaimFile(file, claimForm.claimType);
  };

  const handleClaimTypeChange = (claimType: ClaimType) => {
    setClaimForm((current) => ({ ...current, claimType }));
    if (claimDocument) {
      void analyzeClaimFile(claimDocument, claimType);
    }
  };

  const handleAddLeave = async () => {
    if (!claimForm.employeeId || !claimForm.title.trim()) return;
    if (!isLeaveClaimType(claimForm.claimType)) return;
    try {
      await adminHrService.createClaim({
        employeeId: claimForm.employeeId,
        claimType: claimForm.claimType,
        title: claimForm.title,
        description: claimForm.description || undefined,
        startDate: claimForm.startDate || undefined,
        endDate: claimForm.endDate || undefined,
        daysRequested: claimForm.daysRequested ? Number(claimForm.daysRequested) : undefined,
      });
      setShowAddLeave(false);
      setClaimForm({ ...emptyLeaveForm(), employeeId: employees[0]?.id ?? '' });
      flash('Leave request submitted.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit leave request');
    }
  };

  const handleAddClaim = async () => {
    if (!claimForm.employeeId || !claimForm.title.trim()) return;
    if (!isExpenseClaimType(claimForm.claimType)) return;
    if (claimInvoiceSource === 'internal' && !selectedCompanyInvoiceId) {
      setError('Select a submitted company invoice for this claim.');
      return;
    }
    if (claimInvoiceSource === 'external' && !claimDocument) {
      setError('Upload the external invoice before submitting this claim.');
      return;
    }
    if (claimDocumentAnalysis && !claimDocumentAnalysis.matchesClaimType && claimDocumentAnalysis.source === 'ai') {
      setError('Upload a document that matches this claim type, or change the claim type.');
      return;
    }
    try {
      await adminHrService.createClaim({
        employeeId: claimForm.employeeId,
        claimType: claimForm.claimType,
        title: claimForm.title,
        description: claimForm.description || undefined,
        startDate: claimForm.startDate || undefined,
        endDate: claimForm.endDate || undefined,
        daysRequested: claimForm.daysRequested ? Number(claimForm.daysRequested) : undefined,
        amount: claimForm.amount ? Number(claimForm.amount) : undefined,
        attachmentFileName: claimDocument?.name,
        attachmentMimeType: claimDocument?.type,
        documentAnalysis: claimDocumentAnalysis ?? undefined,
        companyInvoiceId: claimInvoiceSource === 'internal' ? selectedCompanyInvoiceId || undefined : undefined,
      });
      setShowAddClaim(false);
      resetClaimDocument();
      setClaimForm({ ...emptyExpenseForm(), employeeId: employees[0]?.id ?? '' });
      setSelectedCompanyInvoiceId('');
      flash('Expense claim submitted.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit claim');
    }
  };

  const handleReviewClaim = async (claimId: string, status: 'approved' | 'rejected') => {
    try {
      await adminHrService.reviewClaim(claimId, status);
      flash(`Claim ${status}.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review claim');
    }
  };

  const handleAddHoliday = async (date: string, label: string) => {
    const created = await adminHrService.createHoliday({ date, label });
    setHolidays((current) => [...current, created].sort((a, b) => a.date.localeCompare(b.date)));
    flash('Off day added to the company calendar.');
  };

  const handleRemoveHoliday = async (id: string) => {
    await adminHrService.deleteHoliday(id);
    setHolidays((current) => current.filter((holiday) => holiday.id !== id));
    flash('Off day removed.');
  };

  const toggleCreateAccessRule = (module: string, action: string) => {
    setRoleForm((current) => {
      const actions = current.accessRules[module] ?? [];
      return {
        ...current,
        accessRules: {
          ...current.accessRules,
          [module]: actions.includes(action)
            ? actions.filter((value) => value !== action)
            : [...actions, action],
        },
      };
    });
  };

  const toggleCreateAccessColumn = (action: string) => {
    setRoleForm((current) => {
      const selectAll = !ADMIN_PERMISSION_PAGES.every((page) => (current.accessRules[page.id] ?? []).includes(action));
      const accessRules = { ...current.accessRules };
      ADMIN_PERMISSION_PAGES.forEach((page) => {
        const actions = accessRules[page.id] ?? [];
        accessRules[page.id] = selectAll
          ? Array.from(new Set([...actions, action]))
          : actions.filter((value) => value !== action);
      });
      return { ...current, accessRules };
    });
  };

  const toggleEditAccessColumn = (action: string) => {
    setEditRoleForm((current) => {
      const selectAll = !ADMIN_PERMISSION_PAGES.every((page) => (current.accessRules[page.id] ?? []).includes(action));
      const accessRules = { ...current.accessRules };
      ADMIN_PERMISSION_PAGES.forEach((page) => {
        const actions = accessRules[page.id] ?? [];
        accessRules[page.id] = selectAll
          ? Array.from(new Set([...actions, action]))
          : actions.filter((value) => value !== action);
      });
      return { ...current, accessRules };
    });
  };

  return (
    <section className="admin-hr-hub admin-hr-hub--page" aria-label="People and HR">

      {overview ? (
        <div className="admin-hr-hub__kpi-strip">
          <div className="admin-stat-grid admin-stat-grid--4 admin-hr-hub__kpi-grid">
            <article className="admin-stat-card admin-stat-card--blue">
              <div className="admin-stat-card__icon" aria-hidden>
                <HrKpiIcon kind="team" />
              </div>
              <div className="admin-stat-card__body">
                <strong>{overview.totalEmployees.toLocaleString()}</strong>
                <p>Team members</p>
                <span className="admin-stat-card__meta">{overview.rolesCount} active roles</span>
              </div>
            </article>
            <article className="admin-stat-card admin-stat-card--green">
              <div className="admin-stat-card__icon" aria-hidden>
                <HrKpiIcon kind="active" />
              </div>
              <div className="admin-stat-card__body">
                <strong>{overview.activeEmployees.toLocaleString()}</strong>
                <p>Active</p>
                <span className="admin-stat-card__meta admin-stat-card__meta--up">On payroll</span>
              </div>
            </article>
            <article className="admin-stat-card admin-stat-card--amber">
              <div className="admin-stat-card__icon" aria-hidden>
                <HrKpiIcon kind="leave" />
              </div>
              <div className="admin-stat-card__body">
                <strong>{overview.onLeave.toLocaleString()}</strong>
                <p>On leave</p>
                <span className="admin-stat-card__meta">Currently away</span>
              </div>
            </article>
            <article className="admin-stat-card admin-stat-card--red">
              <div className="admin-stat-card__icon" aria-hidden>
                <HrKpiIcon kind="claims" />
              </div>
              <div className="admin-stat-card__body">
                <strong>{overview.pendingClaims.toLocaleString()}</strong>
                <p>Pending expenses</p>
                <span className="admin-stat-card__meta">{overview.pendingLeaves} leave requests pending</span>
              </div>
            </article>
          </div>
          <article className="admin-hr-hub__payroll-card">
            <div className="admin-hr-hub__payroll-icon" aria-hidden>
              <HrKpiIcon kind="payroll" />
            </div>
            <div>
              <span>Monthly payroll</span>
              <strong>{formatMoney(overview.monthlyPayroll)}</strong>
              <p>Combined base salaries for active staff</p>
            </div>
          </article>
        </div>
      ) : null}

      <nav className="admin-hr-hub__tabs" role="tablist">
        {HR_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === 'leaves' && overview && overview.pendingLeaves > 0 ? (
              <em>{overview.pendingLeaves}</em>
            ) : null}
            {item.id === 'claims' && overview && overview.pendingClaims > 0 ? (
              <em>{overview.pendingClaims}</em>
            ) : null}
          </button>
        ))}
      </nav>

      <div className={`admin-hr-hub__body${showDepartmentCreator ? ' is-department-page' : ''}${showAddRole || roleModal?.mode === 'edit' ? ' is-role-page' : ''}${employeeModal ? ' is-employee-page' : ''}`}>
        {loading ? <p className="admin-hr-hub__muted">Loading…</p> : null}
        {error ? <p className="admin-hr-hub__error">{error}</p> : null}

        {tab === 'employees' && !loading ? (
          <section className="admin-hr-hub__section">
            <div className="admin-hr-hub__section-head">
              <h3>Employees</h3>
              <button type="button" className="admin-hr-hub__btn admin-hr-hub__btn--primary" onClick={() => setShowAddEmployee((v) => !v)}>
                {showAddEmployee ? 'Cancel' : '+ Add employee'}
              </button>
            </div>

            {showAddEmployee ? (
              <form
                className="admin-hr-hub__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAddEmployee();
                }}
              >
                <div className="admin-hr-hub__form-grid">
                  <label>
                    Full name
                    <input value={empForm.fullName} onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })} required />
                  </label>
                  <label>
                    Email
                    <input type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} required />
                  </label>
                  <label>
                    Phone
                    <input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
                  </label>
                  <label>
                    Role
                    <select
                      value={empForm.roleId}
                      onChange={(e) => {
                        const role = roles.find((item) => item.id === e.target.value);
                        setEmpForm({ ...empForm, roleId: e.target.value, department: role?.department ?? empForm.department });
                      }}
                      required
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Job title
                    <input value={empForm.jobTitle} onChange={(e) => setEmpForm({ ...empForm, jobTitle: e.target.value })} />
                  </label>
                  <label>
                    Department
                    <select value={empForm.department} onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })} required>
                      <option value="">Select department</option>
                      {employeeDepartmentOptions.map((department) => (
                        <option key={department} value={department}>{department}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Start date
                    <input type="date" value={empForm.startDate} onChange={(e) => setEmpForm({ ...empForm, startDate: e.target.value })} />
                  </label>
                  <label>
                    Monthly salary (R)
                    <input type="number" min={0} value={empForm.salary} onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })} required />
                  </label>
                  <label>
                    Leave balance (days)
                    <input type="number" min={0} value={empForm.leaveBalanceDays} onChange={(e) => setEmpForm({ ...empForm, leaveBalanceDays: e.target.value })} />
                  </label>
                </div>
                <button type="submit" className="admin-hr-hub__btn admin-hr-hub__btn--primary">
                  Save employee
                </button>
              </form>
            ) : null}

            <div className="admin-hr-hub__table-wrap">
              <table className="admin-hr-hub__table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Salary</th>
                    <th>Leave</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <strong>{emp.fullName}</strong>
                        <span>{emp.employeeCode} · {emp.email}</span>
                      </td>
                      <td>
                        {emp.roleName}
                        {emp.jobTitle ? <span>{emp.jobTitle}</span> : null}
                      </td>
                      <td>{formatMoney(emp.salary, emp.currency)}</td>
                      <td>{emp.leaveBalanceDays}d</td>
                      <td>
                        <span className={`admin-hr-hub__pill admin-hr-hub__pill--${statusClass(emp.employmentStatus)}`}>
                          {emp.employmentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="admin-hr-hub__role-card-v2__actions">
                          <RoleIconButton label="Edit employee" kind="edit" onClick={() => openEmployeeEdit(emp)} />
                          <RoleIconButton label="Delete employee" kind="delete" onClick={() => setEmployeePendingDelete(emp)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!employees.length ? (
                    <tr>
                      <td colSpan={6} className="admin-hr-hub__empty">
                        No employees yet. Add your first team member.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {tab === 'access' && !loading ? (
          <section className="admin-hr-hub__section">
            <div className="admin-hr-hub__section-head">
              <div className="admin-hr-hub__section-title">
                <h3>Admin user management</h3>
                <p className="admin-hr-hub__section-sub">People permitted to sign in to the Lavey admin dashboard.</p>
              </div>
              <button type="button" className="admin-hr-hub__btn admin-hr-hub__btn--primary" onClick={() => setShowInviteOperator((value) => !value)}>
                {showInviteOperator ? 'Cancel' : '+ Onboard employee'}
              </button>
            </div>
            {showInviteOperator ? (
              <form className="admin-hr-hub__form" onSubmit={(event) => { event.preventDefault(); void handleInviteOperator(); }}>
                <div className="admin-hr-hub__form-grid">
                  <label>Full name<input required value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} /></label>
                  <label>Email address<input required type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} /></label>
                  <label>Dashboard role<select required value={inviteForm.roleId} onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}><option value="">Select role</option>{roles.filter((role) => role.isActive).map((role) => <option key={role.id} value={role.id}>{role.name} — {role.department}</option>)}</select></label>
                </div>
                <p className="admin-hr-hub__section-sub">They will receive a secure seven-day link to create their password and complete their employee profile.</p>
                <button type="submit" className="admin-hr-hub__btn admin-hr-hub__btn--primary">Send onboarding invitation</button>
              </form>
            ) : null}
            <div className="admin-hr-hub__section-head">
              <input className="admin-hr-hub__search" placeholder="Search admin users…" value={operatorSearch} onChange={(e) => setOperatorSearch(e.target.value)} />
              <span className="admin-hr-hub__section-sub">{operators.length} dashboard users</span>
            </div>
            <div className="admin-hr-hub__table-wrap">
              <table className="admin-hr-hub__table">
                <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th>Actions</th></tr></thead>
                <tbody>
                  {operators.filter((operator) => `${operator.name} ${operator.email} ${operator.roleName}`.toLowerCase().includes(operatorSearch.toLowerCase())).map((operator) => {
                    const pendingInvite = operator.status === 'invited' || operator.status === 'in_progress';
                    return (
                    <tr key={operator.id}>
                      <td><strong>{operator.name}</strong><span>{operator.employeeId ? 'Employee linked' : 'Onboarding pending'}</span></td>
                      <td>{operator.email}</td>
                      <td>{operator.roleName}</td>
                      <td><span className={`admin-hr-hub__pill admin-hr-hub__pill--${operator.status.replace('_', '-')}`}>{operator.status.replace('_', ' ')}</span></td>
                      <td>{operator.lastLoginAt ? new Date(operator.lastLoginAt).toLocaleString('en-ZA') : '—'}</td>
                      <td>
                        {pendingInvite ? (
                          <div className="admin-hr-hub__row-actions">
                            <button
                              type="button"
                              className="admin-hr-hub__btn"
                              disabled={resendingInviteId === operator.id}
                              onClick={() => void handleResendInvite(operator)}
                            >
                              {resendingInviteId === operator.id ? 'Resending…' : 'Resend'}
                            </button>
                            <button
                              type="button"
                              className="admin-hr-hub__btn admin-hr-hub__btn--danger"
                              onClick={() => setInvitePendingDelete(operator)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {tab === 'roles' && !loading ? (
          <section className="admin-hr-hub__section admin-hr-hub__section--roles">
            <div className="admin-hr-hub__section-head">
              <div className="admin-hr-hub__section-title">
                <h3>Roles & permissions</h3>
                <p className="admin-hr-hub__section-sub">
                  Job roles define access — set each employee&apos;s salary individually on the Employees tab.
                </p>
              </div>
              <button type="button" className="admin-hr-hub__btn admin-hr-hub__btn--primary" onClick={() => setShowAddRole((v) => !v)}>
                {showAddRole ? 'Cancel' : '+ Add role'}
              </button>
            </div>

            {showAddRole ? (
              <div className="admin-role-page-shell">
                <div className="admin-role-page admin-hr-hub__role-modal--edit" aria-labelledby="create-role-title">
                  <header className="admin-hr-hub__role-modal__head">
                    <div><span className="admin-hr-hub__role-dept admin-hr-hub__role-dept--lg">Access control</span><h3 id="create-role-title">Create role</h3></div>
                    <button type="button" className="admin-role-page__back" onClick={() => setShowAddRole(false)}>← Back to roles</button>
                  </header>
                  <form className="admin-hr-hub__role-modal__body" onSubmit={(e) => { e.preventDefault(); void handleAddRole(); }}>
                    <div className="admin-hr-hub__form-grid">
                      <label>Role name<input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} required /></label>
                      <label>Department
                        <div className="admin-role-department-field">
                          <select value={roleForm.department} onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })} required>
                            <option value="">Select department</option>
                            {departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}
                          </select>
                          <button type="button" onClick={() => { setError(''); setShowDepartmentCreator(true); setShowAddRole(false); }}>+ Create department</button>
                        </div>
                      </label>
                      <label className="admin-hr-hub__form-span">Description<textarea rows={2} value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} /></label>
                    </div>
                    <div className="admin-access-matrix">
                      <div><strong>Navigation permissions</strong><p>Select what this role can do on every dashboard page.</p></div>
                      <div className="admin-access-matrix__scroll"><table>
                        <thead><tr><th>Navigation page</th>{ADMIN_PERMISSION_ACTIONS.map((action) => <th key={action}><label className="admin-access-matrix__select-all"><input type="checkbox" aria-label={`Select all ${action} permissions`} checked={ADMIN_PERMISSION_PAGES.every((page) => (roleForm.accessRules[page.id] ?? []).includes(action))} onChange={() => toggleCreateAccessColumn(action)} /><span>{action}</span></label></th>)}</tr></thead>
                        <tbody>{ADMIN_PERMISSION_PAGES.map((page) => <tr key={page.id}>
                          <td><strong>{page.label}</strong><span>{page.menu}</span></td>
                          {ADMIN_PERMISSION_ACTIONS.map((action) => <td key={action}><input type="checkbox" aria-label={`${page.label}: ${action}`} checked={(roleForm.accessRules[page.id] ?? []).includes(action)} onChange={() => toggleCreateAccessRule(page.id, action)} /></td>)}
                        </tr>)}</tbody>
                      </table></div>
                    </div>
                    <div className="admin-hr-hub__role-modal__actions">
                      <button type="button" className="admin-hr-hub__btn" onClick={() => setShowAddRole(false)}>Cancel</button>
                      <button type="submit" className="admin-hr-hub__btn admin-hr-hub__btn--primary">Create role</button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}

            <div className="admin-hr-hub__table-wrap">
              <table className="admin-hr-hub__table">
                <thead><tr><th>Role</th><th>Description</th><th>Users</th><th>Access</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{roles.map((role) => (
                  <tr key={role.id}>
                    <td><strong>{role.name}</strong><span>{role.department} · {role.slug}</span></td>
                    <td>{role.description || 'No description'}</td>
                    <td>{role.employeeCount}</td>
                    <td>{Object.keys(role.accessRules ?? {}).length ? `${Object.keys(role.accessRules).length} modules configured` : role.permissions.join(' · ') || 'No access configured'}</td>
                    <td><span className={`admin-hr-hub__pill admin-hr-hub__pill--${role.isActive ? 'active' : 'inactive'}`}>{role.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td><div className="admin-hr-hub__role-card-v2__actions"><RoleIconButton label="View role" kind="view" onClick={() => openRoleView(role)} /><RoleIconButton label="Edit access matrix" kind="edit" onClick={() => openRoleEdit(role)} /><RoleIconButton label="Delete role" kind="delete" onClick={() => void handleDeleteRole(role)} /></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <div className="admin-hr-hub__roles-grid admin-hr-hub__roles-grid--legacy">
              {roles.map((role) => (
                <article
                  key={role.id}
                  className={`admin-hr-hub__role-card-v2 admin-hr-hub__role-card-v2--${departmentTone(role.department)}`}
                >
                  <div className="admin-hr-hub__role-card-v2__top">
                    <span className="admin-hr-hub__role-dept">{role.department}</span>
                    <div className="admin-hr-hub__role-card-v2__actions">
                      <RoleIconButton label="View role" kind="view" onClick={() => openRoleView(role)} />
                      <RoleIconButton label="Edit role" kind="edit" onClick={() => openRoleEdit(role)} />
                      <RoleIconButton label="Delete role" kind="delete" onClick={() => void handleDeleteRole(role)} />
                    </div>
                  </div>
                  <h4>{role.name}</h4>
                  <p>{role.description || 'No description yet.'}</p>
                  <div className="admin-hr-hub__role-card-v2__footer">
                    <span className="admin-hr-hub__role-staff">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {role.employeeCount} {role.employeeCount === 1 ? 'employee' : 'employees'}
                    </span>
                    {!role.isActive ? <em className="admin-hr-hub__role-inactive">Inactive</em> : null}
                  </div>
                  {role.permissions.length > 0 ? (
                    <div className="admin-hr-hub__role-perms">
                      {role.permissions.map((p) => (
                        <span key={p} className={`admin-hr-hub__role-perm admin-hr-hub__role-perm--${permissionTone(p)}`}>
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-hr-hub__role-no-perms">No permissions assigned</p>
                  )}
                </article>
              ))}
              {!roles.length ? (
                <p className="admin-hr-hub__empty admin-hr-hub__empty--roles">No roles yet. Create your first role to assign employees.</p>
              ) : null}
            </div>

            {roleModal ? (
              <div className={roleModal.mode === 'edit' ? 'admin-role-page-shell' : 'admin-hr-hub__role-modal-backdrop'} role={roleModal.mode === 'view' ? 'presentation' : undefined} onClick={() => roleModal.mode === 'view' && setRoleModal(null)}>
                <div
                  className={roleModal.mode === 'edit' ? 'admin-role-page admin-hr-hub__role-modal--edit' : 'admin-hr-hub__role-modal admin-hr-hub__role-modal--view'}
                  role={roleModal.mode === 'view' ? 'dialog' : undefined}
                  aria-modal={roleModal.mode === 'view' ? true : undefined}
                  aria-labelledby="role-modal-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <header className="admin-hr-hub__role-modal__head">
                    <div>
                      <span className={`admin-hr-hub__role-dept admin-hr-hub__role-dept--lg`}>{roleModal.role.department}</span>
                      <h3 id="role-modal-title">{roleModal.mode === 'view' ? roleModal.role.name : 'Edit role'}</h3>
                    </div>
                    <button type="button" className={roleModal.mode === 'edit' ? 'admin-role-page__back' : 'admin-hr-hub__role-modal__close'} aria-label={roleModal.mode === 'edit' ? 'Back to roles' : 'Close'} onClick={() => setRoleModal(null)}>
                      ×
                    </button>
                  </header>

                  {roleModal.mode === 'view' ? (
                    <div className="admin-hr-hub__role-modal__body">
                      <p className="admin-hr-hub__role-modal__desc">{roleModal.role.description || 'No description.'}</p>
                      <dl className="admin-hr-hub__role-modal__meta">
                        <div>
                          <dt>Slug</dt>
                          <dd>{roleModal.role.slug}</dd>
                        </div>
                        <div>
                          <dt>Staff in role</dt>
                          <dd>{roleModal.role.employeeCount}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>{roleModal.role.isActive ? 'Active' : 'Inactive'}</dd>
                        </div>
                      </dl>
                      <div className="admin-hr-hub__role-modal__perms">
                        <strong>Permissions</strong>
                        <div>
                          {roleModal.role.permissions.length ? (
                            roleModal.role.permissions.map((p) => (
                              <span key={p} className={`admin-hr-hub__role-perm admin-hr-hub__role-perm--${permissionTone(p)}`}>
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="admin-hr-hub__role-no-perms">None</span>
                          )}
                        </div>
                      </div>
                      {employees.filter((e) => e.roleId === roleModal.role.id).length > 0 ? (
                        <div className="admin-hr-hub__role-modal__staff">
                          <strong>Employees on this role</strong>
                          <ul>
                            {employees
                              .filter((e) => e.roleId === roleModal.role.id)
                              .map((emp) => (
                                <li key={emp.id}>
                                  <span>{emp.fullName}</span>
                                  <em>{formatMoney(emp.salary, emp.currency)}/mo</em>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ) : null}
                      <div className="admin-hr-hub__role-modal__actions">
                        <button type="button" className="admin-hr-hub__btn" onClick={() => openRoleEdit(roleModal.role)}>
                          Edit role
                        </button>
                        <button type="button" className="admin-hr-hub__btn admin-hr-hub__btn--danger" onClick={() => void handleDeleteRole(roleModal.role)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form
                      className="admin-hr-hub__role-modal__body"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleUpdateRole();
                      }}
                    >
                      <div className="admin-hr-hub__form-grid">
                        <label>
                          Role name
                          <input value={editRoleForm.name} onChange={(e) => setEditRoleForm({ ...editRoleForm, name: e.target.value })} required />
                        </label>
                        <label>Department
                          <div className="admin-role-department-field">
                            <select value={editRoleForm.department} onChange={(e) => setEditRoleForm({ ...editRoleForm, department: e.target.value })} required>
                              <option value="">Select department</option>
                              {departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}
                            </select>
                            <button type="button" onClick={() => { setError(''); setShowDepartmentCreator(true); }}>+ Create department</button>
                          </div>
                        </label>
                        <label className="admin-hr-hub__form-span">
                          Description
                          <textarea rows={3} value={editRoleForm.description} onChange={(e) => setEditRoleForm({ ...editRoleForm, description: e.target.value })} />
                        </label>
                      </div>
                      <div className="admin-access-matrix">
                        <div>
                          <strong>Permissions matrix</strong>
                          <p>Pages come from the dashboard side navigation. New shortcut menus are added here automatically.</p>
                        </div>
                        <div className="admin-access-matrix__scroll">
                          <table>
                            <thead>
                              <tr><th>Navigation page</th>{ADMIN_PERMISSION_ACTIONS.map((action) => <th key={action}><label className="admin-access-matrix__select-all"><input type="checkbox" aria-label={`Select all ${action} permissions`} checked={ADMIN_PERMISSION_PAGES.every((page) => (editRoleForm.accessRules[page.id] ?? []).includes(action))} onChange={() => toggleEditAccessColumn(action)} /><span>{action}</span></label></th>)}</tr>
                            </thead>
                            <tbody>
                              {ADMIN_PERMISSION_PAGES.map((page) => (
                                <tr key={page.id}>
                                  <td><strong>{page.label}</strong><span>{page.menu}</span></td>
                                  {ADMIN_PERMISSION_ACTIONS.map((action) => (
                                    <td key={action}>
                                      <input
                                        type="checkbox"
                                        aria-label={`${page.label}: ${action}`}
                                        checked={(editRoleForm.accessRules[page.id] ?? []).includes(action)}
                                        onChange={() => toggleAccessRule(page.id, action)}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="admin-hr-hub__role-modal__actions">
                        <button type="button" className="admin-hr-hub__btn" onClick={() => setRoleModal(null)}>
                          Cancel
                        </button>
                        <button type="submit" className="admin-hr-hub__btn admin-hr-hub__btn--primary">
                          Save changes
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === 'leaves' && !loading ? (
          <section className="admin-hr-hub__section">
            <div className="admin-hr-hub__section-head">
              <div className="admin-hr-hub__section-title">
                <h3>Leave requests</h3>
                <p className="admin-hr-hub__section-sub">Annual, sick, family, unpaid leave, and remote work</p>
              </div>
              <button
                type="button"
                className="admin-hr-hub__btn admin-hr-hub__btn--primary"
                onClick={() => {
                  if (showAddLeave) {
                    setShowAddLeave(false);
                  } else {
                    setShowAddClaim(false);
                    resetClaimDocument();
                    setClaimForm({ ...emptyLeaveForm(), employeeId: employees[0]?.id ?? claimForm.employeeId });
                    setShowAddLeave(true);
                  }
                }}
              >
                {showAddLeave ? 'Cancel' : '+ New leave request'}
              </button>
            </div>

            <div className="admin-hr-hub__section-title admin-hr-hub__section-title--sub">
              <h3>Company off days</h3>
              <p className="admin-hr-hub__section-sub">
                Set global non-working days (public holidays, company shutdowns). These apply to every employee.
              </p>
            </div>
            <AdminHolidayCalendar
              holidays={holidays}
              onAdd={handleAddHoliday}
              onRemove={handleRemoveHoliday}
            />

            <div className="admin-hr-hub__filters">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={claimFilter === status ? 'is-active' : ''}
                  onClick={() => setClaimFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>

            {showAddLeave ? (
              <form
                className="admin-hr-hub__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAddLeave();
                }}
              >
                <div className="admin-hr-hub__form-grid">
                  <label>
                    Employee
                    <select value={claimForm.employeeId} onChange={(e) => setClaimForm({ ...claimForm, employeeId: e.target.value })} required>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Leave type
                    <select
                      value={claimForm.claimType}
                      onChange={(e) => setClaimForm({ ...claimForm, claimType: e.target.value as ClaimType })}
                    >
                      {LEAVE_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-hr-hub__form-span">
                    Title
                    <input value={claimForm.title} onChange={(e) => setClaimForm({ ...claimForm, title: e.target.value })} required />
                  </label>
                  <label>
                    Start date
                    <input type="date" value={claimForm.startDate} onChange={(e) => setClaimForm({ ...claimForm, startDate: e.target.value })} />
                  </label>
                  <label>
                    End date
                    <input type="date" value={claimForm.endDate} onChange={(e) => setClaimForm({ ...claimForm, endDate: e.target.value })} />
                  </label>
                  <label>
                    Days requested
                    <input type="number" min={0} step={0.5} value={claimForm.daysRequested} onChange={(e) => setClaimForm({ ...claimForm, daysRequested: e.target.value })} />
                  </label>
                  <label className="admin-hr-hub__form-span">
                    Notes
                    <textarea rows={3} value={claimForm.description} onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })} />
                  </label>
                </div>
                <button type="submit" className="admin-hr-hub__btn admin-hr-hub__btn--primary">
                  Submit leave request
                </button>
              </form>
            ) : null}

            <div className="admin-hr-hub__claims">
              {filteredLeaves.map((claim) => (
                <article key={claim.id} className={`admin-hr-hub__claim admin-hr-hub__claim--${claim.status}`}>
                  <header>
                    <div>
                      <strong>{claim.title}</strong>
                      <span>{claim.employeeName} · {claim.employeeCode}</span>
                    </div>
                    <span className={`admin-hr-hub__pill admin-hr-hub__pill--${statusClass(claim.status)}`}>{claim.status}</span>
                  </header>
                  <p>{claimTypeLabel(claim.claimType)}{claim.description ? ` — ${claim.description}` : ''}</p>
                  <div className="admin-hr-hub__claim-meta">
                    {claim.startDate ? <span>{claim.startDate}{claim.endDate ? ` → ${claim.endDate}` : ''}</span> : null}
                    {claim.daysRequested ? <span>{claim.daysRequested} days</span> : null}
                    <time>{new Date(claim.createdAt).toLocaleDateString('en-ZA')}</time>
                  </div>
                  {claim.status === 'pending' ? (
                    <div className="admin-hr-hub__claim-actions">
                      <button type="button" className="admin-hr-hub__btn admin-hr-hub__btn--success" onClick={() => void handleReviewClaim(claim.id, 'approved')}>
                        Approve
                      </button>
                      <button type="button" className="admin-hr-hub__btn admin-hr-hub__btn--danger" onClick={() => void handleReviewClaim(claim.id, 'rejected')}>
                        Reject
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
              {!filteredLeaves.length ? (
                <p className="admin-hr-hub__empty">No leave requests in this filter.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === 'claims' && !loading ? (
          <section className="admin-hr-hub__section">
            <div className="admin-hr-hub__section-head">
              <div className="admin-hr-hub__section-title">
                <h3>Expense claims</h3>
                <p className="admin-hr-hub__section-sub">Employee reimbursements, equipment, training, and company spend</p>
              </div>
              <button
                type="button"
                className="admin-hr-hub__btn admin-hr-hub__btn--primary"
                onClick={() => {
                  if (showAddClaim) {
                    resetClaimDocument();
                    setShowAddClaim(false);
                  } else {
                    setShowAddLeave(false);
                    resetClaimDocument();
                    setClaimForm({ ...emptyExpenseForm(), employeeId: employees[0]?.id ?? claimForm.employeeId });
                    setShowAddClaim(true);
                  }
                }}
              >
                {showAddClaim ? 'Cancel' : '+ New expense claim'}
              </button>
            </div>

            <div className="admin-hr-hub__filters">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={claimFilter === status ? 'is-active' : ''}
                  onClick={() => setClaimFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>

            {showAddClaim ? (
              <form
                className="admin-hr-hub__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAddClaim();
                }}
              >
                <div className="admin-hr-hub__form-grid">
                  <label>
                    Invoice source
                    <select value={claimInvoiceSource} onChange={(e) => {
                      const source = e.target.value as 'internal' | 'external';
                      setClaimInvoiceSource(source);
                      if (source === 'external') setSelectedCompanyInvoiceId('');
                    }}>
                      <option value="internal">Internal company invoice</option>
                      <option value="external">External uploaded invoice</option>
                    </select>
                  </label>
                  {claimInvoiceSource === 'internal' ? (
                    <label>
                      Company invoice
                      <select required value={selectedCompanyInvoiceId} onChange={(e) => {
                        const id = e.target.value;
                        setSelectedCompanyInvoiceId(id);
                        const selectedInvoice = companyInvoices.find((invoice) => invoice.id === id);
                        if (selectedInvoice) {
                          setClaimForm((current) => ({
                            ...current,
                            title: `${selectedInvoice.vendor} — ${selectedInvoice.invoiceNumber}`,
                            description: selectedInvoice.description,
                            amount: String(selectedInvoice.amount),
                            startDate: selectedInvoice.invoiceDate,
                          }));
                        }
                      }}>
                        <option value="">Select submitted invoice</option>
                        {companyInvoices.map((invoice) => (
                          <option key={invoice.id} value={invoice.id}>
                            {invoice.invoiceNumber} — {invoice.vendor} — {formatMoney(invoice.amount, invoice.currency)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>

                {claimInvoiceSource === 'external' ? <div className="admin-hr-hub__doc-upload admin-hr-hub__form-span">
                  <div className="admin-hr-hub__doc-upload-head">
                    <div>
                      <strong>Supporting document</strong>
                      <p>{documentHintForClaimType(claimForm.claimType)}</p>
                    </div>
                    {claimDocumentAnalysis ? (
                      <span
                        className={`admin-hr-hub__doc-verdict admin-hr-hub__doc-verdict--${
                          claimDocumentAnalysis.matchesClaimType ? 'ok' : 'warn'
                        }`}
                      >
                        {claimDocumentAnalysis.matchesClaimType ? 'Verified' : 'Check document'}
                        {claimDocumentAnalysis.source === 'ai' ? ` · ${claimDocumentAnalysis.matchConfidence}%` : ''}
                      </span>
                    ) : null}
                  </div>

                  <label className={`admin-hr-hub__doc-drop${claimDocument ? ' has-file' : ''}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="admin-hr-hub__doc-input"
                      onChange={(e) => void handleClaimDocument(e.target.files?.[0] ?? null)}
                    />
                    {claimDocumentPreview ? (
                      <img src={claimDocumentPreview} alt="Uploaded document preview" className="admin-hr-hub__doc-preview" />
                    ) : (
                      <span className="admin-hr-hub__doc-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <path d="M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                        Drop invoice or click to upload
                        <em>JPG, PNG, or WebP · max 3 MB</em>
                      </span>
                    )}
                  </label>

                  {claimDocumentLoading ? (
                    <p className="admin-hr-hub__doc-status">AI is reading your document…</p>
                  ) : null}
                  {claimDocumentAnalysis && !claimDocumentLoading ? (
                    <p className={`admin-hr-hub__doc-status admin-hr-hub__doc-status--${claimDocumentAnalysis.matchesClaimType ? 'ok' : 'warn'}`}>
                      Detected: <strong>{claimDocumentAnalysis.documentType}</strong>
                      {' — '}
                      {claimDocumentAnalysis.matchReason}
                    </p>
                  ) : null}
                  {claimDocument ? (
                    <button type="button" className="admin-hr-hub__doc-clear" onClick={() => resetClaimDocument()}>
                      Remove document
                    </button>
                  ) : null}
                </div> : null}

                <div className="admin-hr-hub__form-grid">
                  <label>
                    Employee
                    <select value={claimForm.employeeId} onChange={(e) => setClaimForm({ ...claimForm, employeeId: e.target.value })} required>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Claim type
                    <select
                      value={claimForm.claimType}
                      onChange={(e) => handleClaimTypeChange(e.target.value as ClaimType)}
                    >
                      {EXPENSE_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-hr-hub__form-span">
                    Title
                    <input value={claimForm.title} onChange={(e) => setClaimForm({ ...claimForm, title: e.target.value })} required />
                  </label>
                  <label>
                    Amount (R)
                    <input type="number" min={0} value={claimForm.amount} onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })} />
                  </label>
                  <label>
                    Expense date
                    <input type="date" value={claimForm.startDate} onChange={(e) => setClaimForm({ ...claimForm, startDate: e.target.value })} />
                  </label>
                  <label className="admin-hr-hub__form-span">
                    Details
                    <textarea rows={3} value={claimForm.description} onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })} />
                  </label>
                </div>
                <button type="submit" className="admin-hr-hub__btn admin-hr-hub__btn--primary">
                  Submit expense claim
                </button>
              </form>
            ) : null}

            <div className="admin-hr-hub__claims">
              {filteredExpenseClaims.map((claim) => (
                <article key={claim.id} className={`admin-hr-hub__claim admin-hr-hub__claim--${claim.status}`}>
                  <header>
                    <div>
                      <strong>{claim.title}</strong>
                      <span>{claim.employeeName} · {claim.employeeCode}</span>
                    </div>
                    <span className={`admin-hr-hub__pill admin-hr-hub__pill--${statusClass(claim.status)}`}>{claim.status}</span>
                  </header>
                  <p>{claimTypeLabel(claim.claimType)}{claim.description ? ` — ${claim.description}` : ''}</p>
                  {claim.attachmentFileName ? (
                    <p className="admin-hr-hub__claim-doc">
                      Document: {claim.attachmentFileName}
                      {claim.documentAnalysis?.documentType ? ` · ${claim.documentAnalysis.documentType}` : ''}
                    </p>
                  ) : null}
                  {claim.companyInvoiceNumber ? (
                    <p className="admin-hr-hub__claim-doc">Internal invoice: {claim.companyInvoiceNumber}</p>
                  ) : null}
                  <div className="admin-hr-hub__claim-meta">
                    {claim.startDate ? <span>{claim.startDate}{claim.endDate ? ` → ${claim.endDate}` : ''}</span> : null}
                    {claim.daysRequested ? <span>{claim.daysRequested} days</span> : null}
                    {claim.amount ? <span>{formatMoney(claim.amount, claim.currency)}</span> : null}
                    <time>{new Date(claim.createdAt).toLocaleDateString('en-ZA')}</time>
                  </div>
                  {claim.status === 'pending' ? (
                    <div className="admin-hr-hub__claim-actions">
                      <button type="button" className="admin-hr-hub__btn admin-hr-hub__btn--success" onClick={() => void handleReviewClaim(claim.id, 'approved')}>
                        Approve
                      </button>
                      <button type="button" className="admin-hr-hub__btn admin-hr-hub__btn--danger" onClick={() => void handleReviewClaim(claim.id, 'rejected')}>
                        Reject
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
              {!filteredExpenseClaims.length ? (
                <p className="admin-hr-hub__empty">No expense claims in this filter.</p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>

      {showDepartmentCreator ? (
        <div className="admin-department-page-shell">
          <form className="admin-department-page" onSubmit={(e) => { e.preventDefault(); void handleCreateDepartment(); }}>
            <div><span>Company structure</span><h3>Create department</h3><p>The new department becomes available for roles and employee onboarding.</p></div>
            <label>Department name<input autoFocus required disabled={creatingDepartment} value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} placeholder="e.g. Legal & Compliance" /></label>
            {error ? <p className="admin-department-page__error" role="alert">{error}</p> : null}
            <div>
              <button type="button" className="admin-hr-hub__btn" disabled={creatingDepartment} onClick={closeDepartmentCreator}>Cancel</button>
              <button type="submit" className="admin-hr-hub__btn admin-hr-hub__btn--primary" disabled={creatingDepartment || !newDepartmentName.trim()}>
                {creatingDepartment ? <><LogoLoader size="sm" label="Creating department" /> Creating…</> : 'Create department'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {employeeModal ? (
        <div className="admin-employee-page-shell">
          <div
            className="admin-employee-page admin-hr-hub__role-modal--edit"
            aria-labelledby="employee-modal-title"
          >
            <header className="admin-hr-hub__role-modal__head">
              <div>
                <span className="admin-hr-hub__role-dept admin-hr-hub__role-dept--lg">{employeeModal.department}</span>
                <h3 id="employee-modal-title">Edit {employeeModal.fullName}</h3>
              </div>
              <button type="button" className="admin-employee-page__back" aria-label="Back to employees" onClick={() => setEmployeeModal(null)}>
                ×
              </button>
            </header>
            <form
              className="admin-hr-hub__role-modal__body"
              onSubmit={(e) => {
                e.preventDefault();
                void handleUpdateEmployee();
              }}
            >
              <div className="admin-hr-hub__form-grid">
                <label>
                  Full name
                  <input value={editEmpForm.fullName} onChange={(e) => setEditEmpForm({ ...editEmpForm, fullName: e.target.value })} required />
                </label>
                <label>
                  Email
                  <input type="email" value={editEmpForm.email} onChange={(e) => setEditEmpForm({ ...editEmpForm, email: e.target.value })} required />
                </label>
                <label>
                  Phone
                  <input value={editEmpForm.phone} onChange={(e) => setEditEmpForm({ ...editEmpForm, phone: e.target.value })} />
                </label>
                <label>
                  Role
                  <select
                    value={editEmpForm.roleId}
                    onChange={(e) => {
                      const role = roles.find((item) => item.id === e.target.value);
                      setEditEmpForm({ ...editEmpForm, roleId: e.target.value, department: role?.department ?? editEmpForm.department });
                    }}
                    required
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Job title
                  <input value={editEmpForm.jobTitle} onChange={(e) => setEditEmpForm({ ...editEmpForm, jobTitle: e.target.value })} />
                </label>
                <label>
                  Department
                  <select value={editEmpForm.department} onChange={(e) => setEditEmpForm({ ...editEmpForm, department: e.target.value })} required>
                    {!employeeDepartmentOptions.includes(editEmpForm.department) && editEmpForm.department ? (
                      <option value={editEmpForm.department}>{editEmpForm.department}</option>
                    ) : null}
                    <option value="">Select department</option>
                    {employeeDepartmentOptions.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={editEmpForm.employmentStatus}
                    onChange={(e) => setEditEmpForm({ ...editEmpForm, employmentStatus: e.target.value as EmploymentStatus })}
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On leave</option>
                    <option value="probation">Probation</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </label>
                <label>
                  Start date
                  <input type="date" value={editEmpForm.startDate} onChange={(e) => setEditEmpForm({ ...editEmpForm, startDate: e.target.value })} />
                </label>
                <label>
                  Monthly salary (R)
                  <input type="number" min={0} value={editEmpForm.salary} onChange={(e) => setEditEmpForm({ ...editEmpForm, salary: e.target.value })} required />
                </label>
                <label>
                  Leave balance (days)
                  <input type="number" min={0} value={editEmpForm.leaveBalanceDays} onChange={(e) => setEditEmpForm({ ...editEmpForm, leaveBalanceDays: e.target.value })} />
                </label>
                <label className="admin-hr-hub__form-span">
                  Notes
                  <textarea rows={2} value={editEmpForm.notes} onChange={(e) => setEditEmpForm({ ...editEmpForm, notes: e.target.value })} />
                </label>
              </div>
              <div className="admin-hr-hub__role-modal__actions">
                <button type="button" className="admin-hr-hub__btn" onClick={() => setEmployeeModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="admin-hr-hub__btn admin-hr-hub__btn--primary">
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {loading ? <AdminHeartLoader label="Loading company people data" overlay /> : null}
      <AdminConfirmDialog
        open={Boolean(rolePendingDelete)}
        title="Delete role?"
        message={rolePendingDelete ? `Are you sure you want to delete “${rolePendingDelete.name}”? This action cannot be undone.` : ''}
        confirmLabel="Delete role"
        tone="danger"
        busy={deletingRole}
        onCancel={() => setRolePendingDelete(null)}
        onConfirm={() => void confirmDeleteRole()}
      />
      <AdminConfirmDialog
        open={Boolean(employeePendingDelete)}
        title="Delete employee?"
        message={employeePendingDelete ? `Are you sure you want to delete ${employeePendingDelete.fullName}? Their employee record and related HR records will be removed.` : ''}
        confirmLabel="Delete employee"
        tone="danger"
        busy={deletingEmployee}
        onCancel={() => setEmployeePendingDelete(null)}
        onConfirm={() => void confirmDeleteEmployee()}
      />
      <AdminConfirmDialog
        open={Boolean(invitePendingDelete)}
        title="Delete invitation?"
        message={invitePendingDelete ? `Are you sure you want to delete the pending invitation for ${invitePendingDelete.name}? Their onboarding link will stop working.` : ''}
        confirmLabel="Delete invitation"
        tone="danger"
        busy={deletingInvite}
        onCancel={() => setInvitePendingDelete(null)}
        onConfirm={() => void confirmDeleteInvite()}
      />
      <AdminNotificationModal
        open={Boolean(notice)}
        message={notice}
        tone="success"
        autoCloseMs={4000}
        onClose={() => setNotice('')}
      />
    </section>
  );
}
