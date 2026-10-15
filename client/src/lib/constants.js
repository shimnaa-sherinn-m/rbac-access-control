export const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT'];

export const ACTION_LABELS = {
  VIEW: 'View',
  CREATE: 'Create',
  EDIT: 'Edit',
  DELETE: 'Delete',
  APPROVE: 'Approve',
  EXPORT: 'Export',
};

export const ACTION_LETTERS = { VIEW: 'V', CREATE: 'C', EDIT: 'E', DELETE: 'D', APPROVE: 'A', EXPORT: 'X' };

export const BRANCH_SCOPES = [
  { value: 'ASSIGNED_BRANCH', label: 'Assigned Branch Only' },
  { value: 'SELECTED_BRANCHES', label: 'Selected Branches' },
  { value: 'ALL_BRANCHES', label: 'All Branches' },
];

export const BRANCH_SCOPE_LABELS = Object.fromEntries(BRANCH_SCOPES.map((s) => [s.value, s.label]));

export const APPROVAL_LEVELS = [
  { level: 0, label: 'No approval authority', short: 'None' },
  { level: 1, label: 'Level 1 - Cashier', short: 'Level 1' },
  { level: 2, label: 'Level 2 - Branch Manager', short: 'Level 2' },
  { level: 3, label: 'Level 3 - Head Office', short: 'Level 3' },
];

export const AUDIT_ACTIONS = {
  ROLE_CREATED: 'Role created',
  ROLE_UPDATED: 'Role updated',
  ROLE_CLONED: 'Role cloned',
  ROLE_ACTIVATED: 'Role activated',
  ROLE_DEACTIVATED: 'Role deactivated',
  ROLE_DELETED: 'Role deleted',
  PERMISSION_MODIFIED: 'Permission modified',
  BRANCH_SCOPE_CHANGED: 'Branch scope changed',
  APPROVAL_LEVEL_CHANGED: 'Approval level changed',
  ROLE_ASSIGNED: 'Role assigned to user',
  USER_BRANCH_CHANGED: 'User branch changed',
  USER_STATUS_CHANGED: 'User status changed',
};

export const MODULE_ACCESS_DENIED_MESSAGE = 'You do not have permission to open this page.';
