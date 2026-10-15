import { Router } from 'express';
import { AppError, validationError } from '../lib/AppError.js';
import { branchFilter, canAccessBranch, evaluateAccess } from '../lib/access.js';
import { BRANCHES, BRANCH_IDS } from '../lib/branches.js';
import { ACTIONS, MODULES, MODULE_MAP } from '../lib/catalog.js';
import { authorize } from '../middleware/auth.js';

const router = Router();

const RECORDS = MODULES.flatMap((m) =>
  BRANCHES.flatMap((b) =>
    [1, 2].map((n) => ({ id: `${m.module}-${b.id}-${n}`, module: m.module, title: `${m.label} record ${n}`, branchId: b.id })),
  ),
);

function assertModule(module) {
  if (!MODULE_MAP.has(module)) throw new AppError(404, 'PERMISSION_NOT_FOUND', `Unknown module: ${module}`);
}

router.post('/check', (req, res) => {
  const { module, action, branchId } = req.body ?? {};
  assertModule(module);
  if (!ACTIONS.includes(action)) throw validationError('Unknown action');
  if (branchId !== undefined && branchId !== '' && !BRANCH_IDS.has(branchId)) {
    throw new AppError(400, 'INVALID_BRANCH_SCOPE', 'Unknown branch');
  }

  const result = evaluateAccess(req.auth, module, action, branchId || undefined);
  const body = {
    success: result.allowed,
    allowed: result.allowed,
    checks: result.checks,
    ...(result.allowed ? {} : { error: { code: result.code, message: result.message } }),
  };
  res.status(result.allowed ? 200 : 403).json(body);
});

router.get(
  '/:module/records',
  (req, res, next) => {
    assertModule(req.params.module);
    next();
  },
  (req, res, next) => authorize(req.params.module, 'VIEW')(req, res, next),
  (req, res) => {
    const scope = branchFilter(req.auth);
    const inModule = RECORDS.filter((r) => r.module === req.params.module);
    const visible = inModule.filter((r) => canAccessBranch(req.auth, r.branchId));
    res.json({
      success: true,
      branchScope: req.auth.role.branchScope,
      appliedFilter: scope,
      total: inModule.length,
      visible: visible.length,
      records: visible,
    });
  },
);

export default router;
