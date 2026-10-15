import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config.js';
import { MODULES } from '../lib/catalog.js';
import { syncPermissionCatalog } from '../lib/syncCatalog.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import Permission from '../models/Permission.js';
import Role from '../models/Role.js';
import RolePermission from '../models/RolePermission.js';
import User from '../models/User.js';

const LETTER = { V: 'VIEW', C: 'CREATE', E: 'EDIT', D: 'DELETE', A: 'APPROVE', X: 'EXPORT' };
const grant = (module, letters) => ({ module, actions: [...letters].map((l) => LETTER[l]) });
const standard = (letters) => ['MEMBERSHIP', 'SAVINGS', 'RD', 'LOAN', 'CHITTY'].map((m) => grant(m, letters));

const ROLES = [
  {
    name: 'System Administrator',
    description: 'Full access to every module. Protected built-in role.',
    isSystem: true,
    branchScope: 'ALL_BRANCHES',
    approvalLevel: 3,
    approvalLimit: null,
    permissions: MODULES.map((m) => ({ module: m.module, actions: m.actions })),
  },
  {
    name: 'Branch Manager',
    description: 'Manages a branch and approves transactions up to Level 2.',
    branchScope: 'ASSIGNED_BRANCH',
    approvalLevel: 2,
    approvalLimit: 500000,
    permissions: [grant('DASHBOARD', 'V'), grant('CUSTOMER', 'VCEX'), ...standard('VCEAX'), grant('REPORTS', 'VX')],
  },
  {
    name: 'Cashier',
    description: 'Front-desk collections and customer onboarding.',
    branchScope: 'ASSIGNED_BRANCH',
    approvalLevel: 1,
    approvalLimit: 50000,
    permissions: [grant('DASHBOARD', 'V'), grant('CUSTOMER', 'VCE'), grant('MEMBERSHIP', 'VC'), grant('SAVINGS', 'VC'), grant('RD', 'VC'), grant('LOAN', 'V'), grant('CHITTY', 'VC')],
  },
  {
    name: 'Accountant',
    description: 'Reads financial modules and exports reports for selected branches.',
    branchScope: 'SELECTED_BRANCHES',
    branches: ['HO', 'KCH'],
    approvalLevel: 0,
    permissions: [grant('DASHBOARD', 'V'), grant('CUSTOMER', 'V'), grant('SAVINGS', 'VX'), grant('RD', 'VX'), grant('LOAN', 'VX'), grant('CHITTY', 'VX'), grant('REPORTS', 'VX')],
  },
  {
    name: 'Collection Officer',
    description: 'Field collections for RD and Chitty.',
    branchScope: 'ASSIGNED_BRANCH',
    approvalLevel: 0,
    permissions: [grant('DASHBOARD', 'V'), grant('CUSTOMER', 'V'), grant('RD', 'VC'), grant('LOAN', 'V'), grant('CHITTY', 'VC')],
  },
  {
    name: 'Auditor',
    description: 'Read-only access with export across all branches.',
    branchScope: 'ALL_BRANCHES',
    approvalLevel: 0,
    permissions: MODULES.map((m) => ({ module: m.module, actions: m.actions.filter((a) => a === 'VIEW' || a === 'EXPORT') })),
  },
  {
    name: 'Legacy Teller',
    description: 'Retired role kept for reference. Cannot be assigned while inactive.',
    status: 'INACTIVE',
    branchScope: 'ASSIGNED_BRANCH',
    approvalLevel: 0,
    permissions: [grant('DASHBOARD', 'V'), grant('CUSTOMER', 'V')],
  },
];

const USERS = [
  { name: 'Admin User', email: 'admin@demo.com', role: 'System Administrator', branchId: 'HO' },
  { name: 'Meera Nair', email: 'manager@demo.com', role: 'Branch Manager', branchId: 'KCH' },
  { name: 'Rahul Krishnan', email: 'cashier@demo.com', role: 'Cashier', branchId: 'KCH' },
  { name: 'Joseph Mathew', email: 'cashier2@demo.com', role: 'Cashier', branchId: 'CLT' },
  { name: 'Anita Suresh', email: 'accountant@demo.com', role: 'Accountant', branchId: 'HO' },
  { name: 'Vishnu Prasad', email: 'collector@demo.com', role: 'Collection Officer', branchId: 'CLT' },
  { name: 'Fathima Ameen', email: 'auditor@demo.com', role: 'Auditor', branchId: 'HO' },
];

const DEMO_PASSWORD = 'Password@123';

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected. Resetting collections...');

  await Promise.all([
    AuditLog.deleteMany({}),
    Notification.deleteMany({}),
    Permission.deleteMany({}),
    RolePermission.deleteMany({}),
    User.deleteMany({}),
    Role.deleteMany({}),
  ]);
  await Promise.all([Role.init(), User.init(), RolePermission.init()]);
  await syncPermissionCatalog();

  const roleByName = new Map();
  for (const def of ROLES) {
    const { permissions, ...fields } = def;
    const role = await Role.create(fields);
    await RolePermission.insertMany(permissions.map((p) => ({ roleId: role._id, ...p })));
    roleByName.set(role.name, role);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [];
  for (const u of USERS) {
    users.push(
      await User.create({ name: u.name, email: u.email, passwordHash, roleId: roleByName.get(u.role)._id, branchId: u.branchId }),
    );
  }

  const admin = users[0];
  await AuditLog.insertMany(
    [...roleByName.values()].map((role) => ({
      action: 'ROLE_CREATED',
      entityType: 'ROLE',
      entityId: String(role._id),
      entityName: role.name,
      performedBy: { id: admin._id, name: admin.name },
      details: { seeded: true },
    })),
  );
  await Notification.create({ type: 'ROLE_CREATED', message: 'Default roles were created', entityId: undefined });

  console.log(`Seeded ${ROLES.length} roles and ${USERS.length} users.`);
  console.log(`Demo password for every user: ${DEMO_PASSWORD}`);
  console.log(USERS.map((u) => `  ${u.email.padEnd(22)} ${u.role}`).join('\n'));
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('Seeding failed', err);
  await mongoose.disconnect();
  process.exit(1);
});
