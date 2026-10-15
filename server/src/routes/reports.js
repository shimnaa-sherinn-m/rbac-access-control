import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { MODULES } from '../lib/catalog.js';
import { getUserCounts } from '../lib/roleService.js';
import Role from '../models/Role.js';
import RolePermission from '../models/RolePermission.js';
import User from '../models/User.js';

const router = Router();

async function loadRolesWithGrants() {
  const [roles, grants] = await Promise.all([Role.find().sort({ name: 1 }).lean(), RolePermission.find().lean()]);
  const byRole = new Map();
  for (const g of grants) {
    const key = String(g.roleId);
    if (!byRole.has(key)) byRole.set(key, []);
    byRole.get(key).push({ module: g.module, actions: g.actions });
  }
  return { roles, byRole };
}

router.get(
  '/role-summary',
  asyncHandler(async (req, res) => {
    const [{ roles, byRole }, counts] = await Promise.all([loadRolesWithGrants(), getUserCounts()]);
    const rows = roles.map((r) => {
      const grants = byRole.get(String(r._id)) ?? [];
      return {
        id: String(r._id),
        name: r.name,
        status: r.status,
        branchScope: r.branchScope,
        approvalLevel: r.approvalLevel,
        approvalLimit: r.approvalLimit ?? null,
        users: counts.get(String(r._id)) ?? 0,
        modules: grants.length,
        permissions: grants.reduce((sum, g) => sum + g.actions.length, 0),
      };
    });
    res.json({ success: true, rows });
  }),
);

router.get(
  '/permission-matrix',
  asyncHandler(async (req, res) => {
    const { roles, byRole } = await loadRolesWithGrants();
    res.json({
      success: true,
      modules: MODULES,
      roles: roles.map((r) => ({
        id: String(r._id),
        name: r.name,
        status: r.status,
        permissions: byRole.get(String(r._id)) ?? [],
      })),
    });
  }),
);

router.get(
  '/role-assignments',
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ name: 1 }).populate('roleId', 'name status');
    res.json({
      success: true,
      rows: users.map((u) => ({
        id: String(u._id),
        user: u.name,
        email: u.email,
        branchId: u.branchId,
        userStatus: u.status,
        role: u.roleId?.name ?? '-',
        roleStatus: u.roleId?.status ?? '-',
      })),
    });
  }),
);

router.get(
  '/inactive-roles',
  asyncHandler(async (req, res) => {
    const [roles, counts] = await Promise.all([Role.find({ status: 'INACTIVE' }).sort({ name: 1 }).lean(), getUserCounts()]);
    res.json({
      success: true,
      rows: roles.map((r) => ({
        id: String(r._id),
        name: r.name,
        description: r.description ?? '',
        users: counts.get(String(r._id)) ?? 0,
        deactivatedAt: r.updatedAt,
      })),
    });
  }),
);

export default router;
