import { Router } from 'express';
import mongoose from 'mongoose';
import { AppError, validationError } from '../lib/AppError.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { audit } from '../lib/audit.js';
import { BRANCH_IDS } from '../lib/branches.js';
import Role from '../models/Role.js';
import User from '../models/User.js';

const router = Router();

const userEntity = (user) => ({ type: 'USER', id: user._id, name: user.name });

async function findUser(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  const user = await User.findById(id);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  return user;
}

async function assertNotLastAdmin(user) {
  const adminRole = await Role.findOne({ isSystem: true }).select('_id');
  if (!adminRole || String(user.roleId) !== String(adminRole._id) || user.status !== 'ACTIVE') return;
  const others = await User.countDocuments({ roleId: adminRole._id, status: 'ACTIVE', _id: { $ne: user._id } });
  if (others === 0) {
    throw new AppError(409, 'LAST_SYSTEM_ADMIN', 'At least one active System Administrator must always exist');
  }
}

const toDto = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  branchId: user.branchId,
  status: user.status,
  role: user.roleId?._id
    ? { id: String(user.roleId._id), name: user.roleId.name, status: user.roleId.status, isSystem: user.roleId.isSystem }
    : null,
});

async function loadDto(id) {
  const user = await User.findById(id).populate('roleId', 'name status isSystem');
  return toDto(user);
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ name: 1 }).populate('roleId', 'name status isSystem');
    res.json({ success: true, users: users.map(toDto) });
  }),
);

router.patch(
  '/:id/role',
  asyncHandler(async (req, res) => {
    const user = await findUser(req.params.id);
    const { roleId } = req.body ?? {};
    if (!mongoose.isValidObjectId(roleId)) throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
    const role = await Role.findById(roleId);
    if (!role) throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found');
    if (role.status !== 'ACTIVE') throw new AppError(409, 'ROLE_INACTIVE', 'Inactive roles cannot be assigned');

    if (String(user.roleId) !== String(role._id)) {
      await assertNotLastAdmin(user);
      const previous = await Role.findById(user.roleId).select('name');
      user.roleId = role._id;
      await user.save();
      await audit(req, 'ROLE_ASSIGNED', userEntity(user), {
        from: previous?.name ?? null,
        to: role.name,
        roleId: String(role._id),
      });
    }
    res.json({ success: true, user: await loadDto(user._id) });
  }),
);

router.patch(
  '/:id/branch',
  asyncHandler(async (req, res) => {
    const user = await findUser(req.params.id);
    const { branchId } = req.body ?? {};
    if (!BRANCH_IDS.has(branchId)) throw new AppError(400, 'INVALID_BRANCH_SCOPE', 'Unknown branch');
    if (user.branchId !== branchId) {
      const from = user.branchId;
      user.branchId = branchId;
      await user.save();
      await audit(req, 'USER_BRANCH_CHANGED', userEntity(user), { from, to: branchId });
    }
    res.json({ success: true, user: await loadDto(user._id) });
  }),
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const user = await findUser(req.params.id);
    const { status } = req.body ?? {};
    if (!['ACTIVE', 'INACTIVE'].includes(status)) throw validationError('Status must be ACTIVE or INACTIVE');
    if (user.status !== status) {
      if (status === 'INACTIVE') await assertNotLastAdmin(user);
      const from = user.status;
      user.status = status;
      await user.save();
      await audit(req, 'USER_STATUS_CHANGED', userEntity(user), { from, to: status });
    }
    res.json({ success: true, user: await loadDto(user._id) });
  }),
);

export default router;
