import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema(
  {
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    module: { type: String, required: true },
    actions: { type: [String], default: [] },
  },
  { collection: 'role_permissions' },
);

rolePermissionSchema.index({ roleId: 1, module: 1 }, { unique: true });

export default mongoose.model('RolePermission', rolePermissionSchema);
