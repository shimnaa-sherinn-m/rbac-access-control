import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import Notification from '../models/Notification.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.auth.user._id;
    const rows = await Notification.find().sort({ createdAt: -1 }).limit(30).lean();
    const notifications = rows.map((n) => ({
      id: String(n._id),
      type: n.type,
      message: n.message,
      entityId: n.entityId ?? null,
      createdAt: n.createdAt,
      read: n.readBy.some((id) => String(id) === String(userId)),
    }));
    res.json({ success: true, notifications, unreadCount: notifications.filter((n) => !n.read).length });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ readBy: { $ne: req.auth.user._id } }, { $addToSet: { readBy: req.auth.user._id } });
    res.json({ success: true });
  }),
);

export default router;
