export function hasPermission(auth, module, action) {
  return auth.permissions.get(module)?.has(action) ?? false;
}

export function canAccessBranch({ user, role }, branchId) {
  switch (role.branchScope) {
    case 'ALL_BRANCHES':
      return true;
    case 'SELECTED_BRANCHES':
      return role.branches.includes(branchId);
    case 'ASSIGNED_BRANCH':
    default:
      return branchId === user.branchId;
  }
}

export function branchFilter({ user, role }, field = 'branchId') {
  switch (role.branchScope) {
    case 'ALL_BRANCHES':
      return {};
    case 'SELECTED_BRANCHES':
      return { [field]: { $in: role.branches } };
    case 'ASSIGNED_BRANCH':
    default:
      return { [field]: user.branchId };
  }
}

export function evaluateAccess(auth, module, action, branchId) {
  const permission = hasPermission(auth, module, action);
  const branchScope = branchId ? canAccessBranch(auth, branchId) : true;
  const checks = { permission, branchScope };

  if (!permission) {
    return { allowed: false, code: 'FORBIDDEN', message: `Your role does not allow ${action} on ${module}`, checks };
  }
  if (!branchScope) {
    return { allowed: false, code: 'BRANCH_SCOPE_DENIED', message: `Your branch scope does not include branch ${branchId}`, checks };
  }
  return { allowed: true, checks };
}
