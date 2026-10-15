import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { BRANCHES } from '../lib/branches.js';
import { ACTIONS, APPROVAL_LEVELS, BRANCH_SCOPES } from '../lib/catalog.js';
import Permission from '../models/Permission.js';

const router = Router();

router.get(
  '/permissions',
  asyncHandler(async (req, res) => {
    const modules = await Permission.find().sort({ order: 1 }).select('-_id module label actions').lean();
    res.json({ success: true, modules, actions: ACTIONS, branchScopes: BRANCH_SCOPES, approvalLevels: APPROVAL_LEVELS });
  }),
);

router.get('/branches', (req, res) => {
  res.json({ success: true, branches: BRANCHES });
});

export default router;
