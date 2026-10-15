export const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT'];

export const MODULES = [
  { module: 'DASHBOARD', label: 'Dashboard', actions: ['VIEW'] },
  { module: 'CUSTOMER', label: 'Customers', actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'] },
  { module: 'MEMBERSHIP', label: 'Membership', actions: ACTIONS },
  { module: 'SAVINGS', label: 'Savings', actions: ACTIONS },
  { module: 'RD', label: 'Recurring Deposit (RD)', actions: ACTIONS },
  { module: 'LOAN', label: 'Loan', actions: ACTIONS },
  { module: 'CHITTY', label: 'Chitty', actions: ACTIONS },
  { module: 'REPORTS', label: 'Reports', actions: ['VIEW', 'EXPORT'] },
];

export const MODULE_MAP = new Map(MODULES.map((m) => [m.module, m]));

export const ROLE_STATUSES = ['ACTIVE', 'INACTIVE'];
export const BRANCH_SCOPES = ['ASSIGNED_BRANCH', 'SELECTED_BRANCHES', 'ALL_BRANCHES'];

export const APPROVAL_LEVELS = [
  { level: 0, label: 'No approval authority' },
  { level: 1, label: 'Level 1 - Cashier' },
  { level: 2, label: 'Level 2 - Branch Manager' },
  { level: 3, label: 'Level 3 - Head Office' },
];
export const MAX_APPROVAL_LEVEL = APPROVAL_LEVELS.length - 1;
