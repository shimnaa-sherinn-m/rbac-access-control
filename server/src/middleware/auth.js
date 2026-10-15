import jwt from 'jsonwebtoken';
import { env } from '../config.js';
import { AppError } from '../lib/AppError.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { evaluateAccess } from '../lib/access.js';
import Role from '../models/Role.js';
import RolePermission from '../models/RolePermission.js';
import User from '../models/User.js';

export async function loadAuthContext(user) {
  const role = await Role.findById(user.roleId);
  if (!role) throw new AppError(403, 'ROLE_NOT_FOUND', 'Your assigned role no longer exists');
  if (role.status !== 'ACTIVE') {
    throw new AppError(403, 'ROLE_INACTIVE', 'Your role has been deactivated. Contact an administrator.');
  }
  const grants = await RolePermission.find({ roleId: role._id }).lean();
  const permissions = new Map(grants.map((g) => [g.module, new Set(g.actions)]));
  return { user, role, permissions };
}

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError(401, 'UNAUTHENTICATED', 'This account is not active');
  }

  req.auth = await loadAuthContext(user);
  next();
});

export function requireSystemAdmin(req, res, next) {
  if (!req.auth.role.isSystem) {
    throw new AppError(403, 'FORBIDDEN', 'Only System Administrators can perform this action');
  }
  next();
}

export const authorize = (module, action, getBranchId) => (req, res, next) => {
  const branchId = getBranchId ? getBranchId(req) : undefined;
  const result = evaluateAccess(req.auth, module, action, branchId);
  if (!result.allowed) throw new AppError(403, result.code, result.message);
  next();
};

export function serializeProfile({ user, role, permissions }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    branchId: user.branchId,
    role: {
      id: String(role._id),
      name: role.name,
      isSystem: role.isSystem,
      branchScope: role.branchScope,
      branches: role.branches,
      approvalLevel: role.approvalLevel,
      approvalLimit: role.approvalLimit ?? null,
    },
    permissions: [...permissions].map(([module, actions]) => ({ module, actions: [...actions] })),
  };
}
