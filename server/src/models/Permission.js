import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    actions: { type: [String], required: true },
    order: { type: Number, default: 0 },
  },
  { collection: 'permissions' },
);

export default mongoose.model('Permission', permissionSchema);
