import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    entityId: { type: String },
    readBy: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'notifications' },
);

notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
