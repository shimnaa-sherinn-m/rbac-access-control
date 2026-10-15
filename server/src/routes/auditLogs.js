import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import AuditLog from '../models/AuditLog.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const filter = {};
    if (typeof req.query.action === 'string' && req.query.action) filter.action = req.query.action;
    if (typeof req.query.entityId === 'string' && req.query.entityId) filter.entityId = req.query.entityId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      logs: logs.map((l) => ({
        id: String(l._id),
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        entityName: l.entityName,
        performedBy: l.performedBy?.name ?? 'System',
        details: l.details,
        createdAt: l.createdAt,
      })),
    });
  }),
);

export default router;
