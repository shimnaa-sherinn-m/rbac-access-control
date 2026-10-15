import { Router } from 'express';
import mongoose from 'mongoose';
import { AppError, validationError } from '../lib/AppError.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { audit, notify } from '../lib/audit.js';
import { BRANCH_SCOPES, ROLE_STATUSES } from '../lib/catalog.js';
import {
  assertProtectedRoleUnchanged,
  assertUniqueName,
  buildRoleDto,
  diffPermissions,
  finalizeRoleState,
  getRolePermissions,
  getUserCounts,
  isEmptyDiff,
  normalizePermissions,
  parseRoleFields,
  pickRoleState,
  recordRoleChanges,
  replacePermissions,
  toRoleDto,
  uniqueCopyName,
} from '../lib/roleService.js';
import Role from '../models/Role.js';
import RolePermission from '../models/RolePermission.js';
import User from '../models/User.js';

const router = Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const roleEntity = (role) => ({ type: 'ROLE', id: role._id, name: role.name });
const actor = (req) => req.auth.user._id;

async function findRole(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
  const role = await Role.findById(id);
  if (!role) throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
  return role;
}

const SORTERS = {
  name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  createdAt: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  userCount: (a, b) => a.userCount - b.userCount,
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, status, branchScope } = req.query;
    const sort = SORTERS[req.query.sort] ? req.query.sort : 'name';
    const direction = req.query.order === 'desc' ? -1 : 1;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const filter = {};
    if (typeof search === 'string' && search.trim()) {
      filter.name = new RegExp(escapeRegex(search.trim()), 'i');
    }
    if (status) {
      if (!ROLE_STATUSES.includes(status)) throw validationError('Invalid status filter');
      filter.status = status;
    }
    if (branchScope) {
      if (!BRANCH_SCOPES.includes(branchScope)) throw new AppError(400, 'INVALID_BRANCH_SCOPE', 'Invalid branch scope filter');
      filter.branchScope = branchScope;
    }

    const [roles, counts] = await Promise.all([Role.find(filter).lean(), getUserCounts()]);
    const rows = roles.map((r) => toRoleDto(r, undefined, counts.get(String(r._id)) ?? 0));
    rows.sort((a, b) => SORTERS[sort](a, b) * direction || SORTERS.name(a, b));

    res.json({
      success: true,
      roles: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      limit,
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const role = await findRole(req.params.id);
    const [dto, users] = await Promise.all([
      buildRoleDto(role),
      User.find({ roleId: role._id }).sort({ name: 1 }).limit(100).lean(),
    ]);
    res.json({
      success: true,
      role: dto,
      users: users.map((u) => ({ id: String(u._id), name: u.name, email: u.email, branchId: u.branchId, status: u.status })),
    });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const fields = parseRoleFields(body);
    if (!fields.name) throw validationError('Role name is required');

    const state = finalizeRoleState({
      description: '',
      status: 'ACTIVE',
      branchScope: 'ASSIGNED_BRANCH',
      branches: [],
      approvalLevel: 0,
      approvalLimit: null,
      ...fields,
    });
    const permissions = normalizePermissions(body.permissions ?? []);

    await assertUniqueName(state.name);
    const role = await Role.create({ ...state, createdBy: actor(req), updatedBy: actor(req) });
    try {
      await replacePermissions(role._id, permissions);
    } catch (err) {
      await Role.deleteOne({ _id: role._id });
      throw err;
    }

    await audit(req, 'ROLE_CREATED', roleEntity(role), { ...state, permissions });
    await notify('ROLE_CREATED', `Role "${role.name}" was created`, role._id);
    res.status(201).json({ success: true, role: await buildRoleDto(role) });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const role = await findRole(req.params.id);
    const before = pickRoleState(role);
    const after = finalizeRoleState({ ...before, ...parseRoleFields(body) });

    let nextPermissions = null;
    let permDiff = null;
    if (body.permissions !== undefined) {
      nextPermissions = normalizePermissions(body.permissions);
      permDiff = diffPermissions(await getRolePermissions(role._id), nextPermissions);
    }

    if (role.isSystem) assertProtectedRoleUnchanged(before, after, permDiff);
    if (after.name !== before.name) await assertUniqueName(after.name, role._id);

    role.set({ ...after, updatedBy: actor(req) });
    await role.save();
    if (nextPermissions && !isEmptyDiff(permDiff)) await replacePermissions(role._id, nextPermissions);

    await recordRoleChanges(req, role, before, after, permDiff);
    res.json({ success: true, role: await buildRoleDto(role) });
  }),
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const role = await findRole(req.params.id);
    const { status } = req.body ?? {};
    if (!ROLE_STATUSES.includes(status)) throw validationError('Status must be ACTIVE or INACTIVE');
    if (role.isSystem && status !== 'ACTIVE') {
      throw new AppError(403, 'PROTECTED_ROLE', 'Cannot deactivate protected role');
    }

    const before = pickRoleState(role);
    if (before.status !== status) {
      role.set({ status, updatedBy: actor(req) });
      await role.save();
      await recordRoleChanges(req, role, before, pickRoleState(role), null);
    }
    res.json({ success: true, role: await buildRoleDto(role) });
  }),
);

router.post(
  '/:id/clone',
  asyncHandler(async (req, res) => {
    const source = await findRole(req.params.id);
    const body = req.body ?? {};
    const fields = parseRoleFields({ name: body.name || undefined, description: body.description });

    const name = fields.name ?? (await uniqueCopyName(source.name));
    await assertUniqueName(name);

    const permissions = await getRolePermissions(source._id);
    const state = {
      ...pickRoleState(source),
      name,
      status: 'ACTIVE',
      ...(fields.description !== undefined ? { description: fields.description } : {}),
    };

    const role = await Role.create({ ...state, isSystem: false, createdBy: actor(req), updatedBy: actor(req) });
    try {
      await replacePermissions(role._id, permissions);
    } catch (err) {
      await Role.deleteOne({ _id: role._id });
      throw err;
    }

    await audit(req, 'ROLE_CLONED', roleEntity(role), { sourceId: String(source._id), sourceName: source.name });
    await notify('ROLE_CREATED', `Role "${role.name}" was created (cloned from "${source.name}")`, role._id);
    res.status(201).json({ success: true, role: await buildRoleDto(role) });
  }),
);

router.put(
  '/:id/permissions',
  asyncHandler(async (req, res) => {
    const role = await findRole(req.params.id);
    const next = normalizePermissions(req.body?.permissions ?? []);
    const diff = diffPermissions(await getRolePermissions(role._id), next);

    if (role.isSystem && !isEmptyDiff(diff)) {
      throw new AppError(403, 'PROTECTED_ROLE', 'System Administrator permissions cannot be changed');
    }

    if (!isEmptyDiff(diff)) {
      await replacePermissions(role._id, next);
      role.updatedBy = actor(req);
      await role.save();
      const state = pickRoleState(role);
      await recordRoleChanges(req, role, state, state, diff);
    }
    res.json({ success: true, role: await buildRoleDto(role) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const role = await findRole(req.params.id);
    if (role.isSystem) throw new AppError(403, 'PROTECTED_ROLE', 'The System Administrator role cannot be deleted');
    if (await User.exists({ roleId: role._id })) {
      throw new AppError(409, 'ROLE_ASSIGNED', 'Cannot delete assigned role');
    }
    await RolePermission.deleteMany({ roleId: role._id });
    await Role.deleteOne({ _id: role._id });
    await audit(req, 'ROLE_DELETED', roleEntity(role), {});
    res.json({ success: true });
  }),
);

export default router;
