import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';

export async function audit(req, action, entity, details = {}) {
  try {
    await AuditLog.create({
      action,
      entityType: entity.type,
      entityId: String(entity.id),
      entityName: entity.name ?? '',
      performedBy: { id: req.auth.user._id, name: req.auth.user.name },
      details,
    });
  } catch (err) {
    console.error('Failed to write audit log', action, err);
  }
}

export async function notify(type, message, entityId) {
  try {
    await Notification.create({ type, message, entityId: entityId ? String(entityId) : undefined });
  } catch (err) {
    console.error('Failed to create notification', type, err);
  }
}
