import Role from '../models/Role.js';
import RolePermission from '../models/RolePermission.js';
import User from '../models/User.js';
import { AppError, validationError } from './AppError.js';
import { audit, notify } from './audit.js';
import { BRANCH_IDS } from './branches.js';
import { BRANCH_SCOPES, MAX_APPROVAL_LEVEL, MODULES, MODULE_MAP, ROLE_STATUSES } from './catalog.js';

const NAME_COLLATION = { locale: 'en', strength: 2 };

export function toRoleDto(role, permissions, userCount = 0) {
  return {
    id: String(role._id),
    name: role.name,
    description: role.description ?? '',
    status: role.status,
    branchScope: role.branchScope,
    branches: role.branches ?? [],
    approvalLevel: role.approvalLevel ?? 0,
    approvalLimit: role.approvalLimit ?? null,
    isSystem: Boolean(role.isSystem),
    userCount,
    ...(permissions ? { permissions } : {}),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

export async function getRolePermissions(roleId) {
  const rows = await RolePermission.find({ roleId }).lean();
  const byModule = new Map(rows.map((r) => [r.module, r.actions]));
  return MODULES.filter((m) => byModule.has(m.module)).map((m) => ({
    module: m.module,
    actions: m.actions.filter((a) => byModule.get(m.module).includes(a)),
  }));
}

export async function getUserCounts() {
  const rows = await User.aggregate([{ $group: { _id: '$roleId', count: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

export async function buildRoleDto(role) {
  const [permissions, userCount] = await Promise.all([
    getRolePermissions(role._id),
    User.countDocuments({ roleId: role._id }),
  ]);
  return toRoleDto(role, permissions, userCount);
}

export function parseRoleFields(body) {
  const out = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw validationError('Role name is required');
    if (name.length > 100) throw validationError('Role name must be at most 100 characters');
    out.name = name;
  }

  if (body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length > 500) throw validationError('Description must be at most 500 characters');
    out.description = description;
  }

  if (body.status !== undefined) {
    if (!ROLE_STATUSES.includes(body.status)) throw validationError('Status must be ACTIVE or INACTIVE');
    out.status = body.status;
  }

  if (body.branchScope !== undefined) {
    if (!BRANCH_SCOPES.includes(body.branchScope)) {
      throw new AppError(400, 'INVALID_BRANCH_SCOPE', `Branch scope must be one of ${BRANCH_SCOPES.join(', ')}`);
    }
    out.branchScope = body.branchScope;
  }

  if (body.branches !== undefined) {
    if (!Array.isArray(body.branches)) throw validationError('branches must be an array');
    const ids = [...new Set(body.branches.map(String))];
    const unknown = ids.filter((id) => !BRANCH_IDS.has(id));
    if (unknown.length) throw new AppError(400, 'INVALID_BRANCH_SCOPE', `Unknown branch: ${unknown.join(', ')}`);
    out.branches = ids;
  }

  if (body.approvalLevel !== undefined) {
    const level = Number(body.approvalLevel);
    if (!Number.isInteger(level) || level < 0 || level > MAX_APPROVAL_LEVEL) {
      throw validationError(`Approval level must be a whole number between 0 and ${MAX_APPROVAL_LEVEL}`);
    }
    out.approvalLevel = level;
  }

  if (body.approvalLimit !== undefined) {
    if (body.approvalLimit === null || body.approvalLimit === '') {
      out.approvalLimit = null;
    } else {
      const limit = Number(body.approvalLimit);
      if (!Number.isFinite(limit) || limit < 0) throw validationError('Approval limit must be a non-negative number');
      out.approvalLimit = limit;
    }
  }

  return out;
}

export function finalizeRoleState(state) {
  const next = { ...state };
  if (next.branchScope === 'SELECTED_BRANCHES') {
    if (!next.branches.length) {
      throw new AppError(400, 'INVALID_BRANCH_SCOPE', 'Select at least one branch for "Selected Branches"');
    }
  } else {
    next.branches = [];
  }
  if (next.approvalLevel === 0) next.approvalLimit = null;
  return next;
}

export function normalizePermissions(input) {
  if (!Array.isArray(input)) throw validationError('permissions must be an array');

  const byModule = new Map();
  for (const entry of input) {
    const moduleKey = String(entry?.module ?? '').toUpperCase();
    const def = MODULE_MAP.get(moduleKey);
    if (!def) throw new AppError(404, 'PERMISSION_NOT_FOUND', `Unknown module: ${entry?.module}`);
    const actions = Array.isArray(entry.actions) ? entry.actions : [];
    const set = byModule.get(moduleKey) ?? new Set();
    for (const raw of actions) {
      const action = String(raw).toUpperCase();
      if (!def.actions.includes(action)) {
        throw new AppError(404, 'PERMISSION_NOT_FOUND', `Action ${raw} is not available for module ${moduleKey}`);
      }
      set.add(action);
    }
    byModule.set(moduleKey, set);
  }

  const result = MODULES.filter((m) => byModule.get(m.module)?.size).map((m) => ({
    module: m.module,
    actions: m.actions.filter((a) => byModule.get(m.module).has(a)),
  }));

  if (!result.length) throw new AppError(400, 'EMPTY_PERMISSIONS', 'A role must have at least one permission');
  return result;
}

export async function assertUniqueName(name, excludeId) {
  const filter = { name };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await Role.exists(filter).collation(NAME_COLLATION);
  if (existing) throw new AppError(409, 'DUPLICATE_ROLE_NAME', 'A role with this name already exists');
}

export async function uniqueCopyName(sourceName) {
  const withSuffix = (suffix) => `${sourceName.slice(0, 100 - suffix.length)}${suffix}`;
  for (let i = 1; i < 100; i += 1) {
    const candidate = withSuffix(i === 1 ? ' (Copy)' : ` (Copy ${i})`);
    const taken = await Role.exists({ name: candidate }).collation(NAME_COLLATION);
    if (!taken) return candidate;
  }
  throw new AppError(409, 'DUPLICATE_ROLE_NAME', 'Could not generate a unique name for the clone');
}

export const diffPermissions = (current, next) => {
  const flatten = (list) => new Set(list.flatMap((e) => e.actions.map((a) => `${e.module}.${a}`)));
  const before = flatten(current);
  const after = flatten(next);
  return {
    added: [...after].filter((x) => !before.has(x)),
    removed: [...before].filter((x) => !after.has(x)),
  };
};

export const isEmptyDiff = (diff) => !diff.added.length && !diff.removed.length;

export async function replacePermissions(roleId, permissions) {
  const ops = permissions.map((p) => ({
    updateOne: {
      filter: { roleId, module: p.module },
      update: { $set: { actions: p.actions } },
      upsert: true,
    },
  }));
  ops.push({
    deleteMany: { filter: { roleId, module: { $nin: permissions.map((p) => p.module) } } },
  });
  await RolePermission.bulkWrite(ops, { ordered: true });
}

export const pickRoleState = (role) => ({
  name: role.name,
  description: role.description ?? '',
  status: role.status,
  branchScope: role.branchScope,
  branches: [...(role.branches ?? [])],
  approvalLevel: role.approvalLevel ?? 0,
  approvalLimit: role.approvalLimit ?? null,
});

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function diffFields(before, after, keys) {
  const changes = {};
  for (const key of keys) {
    if (!sameValue(before[key], after[key])) changes[key] = { from: before[key], to: after[key] };
  }
  return changes;
}

export function assertProtectedRoleUnchanged(before, after, permDiff) {
  const locked = ['name', 'status', 'branchScope', 'branches', 'approvalLevel', 'approvalLimit'];
  const touched = Object.keys(diffFields(before, after, locked));
  if (touched.length || (permDiff && !isEmptyDiff(permDiff))) {
    throw new AppError(403, 'PROTECTED_ROLE', 'System Administrator is a protected role; only its description can be edited');
  }
}

export async function recordRoleChanges(req, role, before, after, permDiff) {
  const entity = { type: 'ROLE', id: role._id, name: role.name };
  const general = diffFields(before, after, ['name', 'description']);
  const scope = diffFields(before, after, ['branchScope', 'branches']);
  const approval = diffFields(before, after, ['approvalLevel', 'approvalLimit']);
  const statusChanged = before.status !== after.status;
  const permissionsChanged = Boolean(permDiff) && !isEmptyDiff(permDiff);
  const has = (obj) => Object.keys(obj).length > 0;

  if (has(general)) await audit(req, 'ROLE_UPDATED', entity, { changes: general });
  if (has(scope)) await audit(req, 'BRANCH_SCOPE_CHANGED', entity, { changes: scope });
  if (has(approval)) await audit(req, 'APPROVAL_LEVEL_CHANGED', entity, { changes: approval });
  if (permissionsChanged) await audit(req, 'PERMISSION_MODIFIED', entity, permDiff);
  if (statusChanged) {
    const action = after.status === 'ACTIVE' ? 'ROLE_ACTIVATED' : 'ROLE_DEACTIVATED';
    await audit(req, action, entity, { from: before.status, to: after.status });
  }

  if (has(general) || has(scope) || has(approval)) {
    await notify('ROLE_UPDATED', `Role "${role.name}" was updated`, role._id);
  }
  if (permissionsChanged) {
    await notify('PERMISSION_CHANGED', `Permissions changed for role "${role.name}"`, role._id);
  }
  if (statusChanged) {
    const verb = after.status === 'ACTIVE' ? 'activated' : 'deactivated';
    await notify(after.status === 'ACTIVE' ? 'ROLE_ACTIVATED' : 'ROLE_DEACTIVATED', `Role "${role.name}" was ${verb}`, role._id);
  }
}
