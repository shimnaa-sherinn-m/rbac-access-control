import mongoose from 'mongoose';
import { BRANCH_SCOPES, MAX_APPROVAL_LEVEL, ROLE_STATUSES } from '../lib/catalog.js';

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: ROLE_STATUSES, default: 'ACTIVE' },
    branchScope: { type: String, enum: BRANCH_SCOPES, default: 'ASSIGNED_BRANCH' },
    branches: { type: [String], default: [] },
    approvalLevel: { type: Number, min: 0, max: MAX_APPROVAL_LEVEL, default: 0 },
    approvalLimit: { type: Number, min: 0, default: null },
    isSystem: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'roles' },
);

roleSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model('Role', roleSchema);
