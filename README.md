# Access Control (Roles & Permissions) - RBAC Module

A full-stack implementation of the **Access Control (RBAC)** module of an ERP: reusable roles, a module × action permission matrix, branch scope, approval levels, audit logs and backend enforcement.

**Stack:** React 18 · Vite · Tailwind CSS · Node.js · Express · MongoDB (Mongoose) · JWT



## Demo logins

All demo users share the password **`Password@123`**.

| Email | Role | Branch scope |
| --- | --- | --- |
| `admin@demo.com` | System Administrator | All branches (can manage roles) |
| `manager@demo.com` | Branch Manager | Assigned branch only |
| `cashier@demo.com` | Cashier | Assigned branch only |
| `accountant@demo.com` | Accountant | Selected branches (Head Office + Kochi) |
| `auditor@demo.com` | Auditor | All branches, read-only |

Tip: sign in as the Cashier, open **My Access**, and try "Approve Loan" or a branch outside the scope to see the backend return HTTP 403.

## What's implemented

| PDD section | Implementation |
| --- | --- |
| FR-001 View Roles | Role List (RBAC-001) with search, status and branch-scope filters, sorting (name / created date / user count), pagination, CSV export |
| FR-002 / 003 Create / Edit Role | Role form (RBAC-002/003): general info, permission matrix, branch scope, approval settings |
| FR-004 / 005 Activate / Deactivate | Status toggle with confirmation; protected role cannot be deactivated |
| FR-006 Clone Role | Clone dialog (RBAC-006) copies permissions, scope and approval settings |
| FR-007 - 010 Permissions | Permission Matrix screen (RBAC-004): edit one role, or compare all roles side by side |
| FR-011 - 013 Branch scope | Assigned Branch / Selected Branches / All Branches, enforced on the API |
| FR-014 / 015 Approval | Approval level (0-3) and optional approval limit; Approval Levels overview screen |
| Role details | RBAC-005 with permissions, assigned users, recent activity |
| Reports | Role Summary, Permission Matrix, Role Assignment, Inactive Roles (all exportable) |
| Notifications | Role created / updated / activated / deactivated / permission changed (bell icon) |
| Audit logs | Role created / updated, permission modified, branch scope changed, approval level changed (+ role assignment) |

### Business rules (enforced in the API, not just the UI)

- Role names are unique (case-insensitive) and max 100 characters; description max 500
- A role cannot be deleted while assigned to users (`DELETE /roles/:id`; deactivation is the recommended path)
- The **System Administrator** role is protected: it cannot be deleted, deactivated, renamed, or have its permissions changed
- At least one active System Administrator must always exist (blocked on role change and user deactivation)
- Inactive roles cannot be assigned to users
- A role must have at least one permission
- Only System Administrators can create, edit, clone, activate or deactivate roles (prevents privilege escalation)
- Permission changes apply **immediately**, even to sessions already logged in, because permissions are resolved from the database on every request instead of being baked into the JWT. A role deactivated mid-session causes the next request to fail and the user is signed out

### Security design

- **Backend is the source of truth.** Every request goes through `authenticate`, which loads the user's role and permissions fresh. Module endpoints use `authorize(module, action)` and branch scope checks (see `server/src/middleware/auth.js` and `server/src/lib/access.js`). Hiding UI elements is only cosmetic.
- Users store only `roleId`; effective permissions are resolved through the role.
- Permissions are modelled as **Role → Module → Actions** (+ data scope + approval level) instead of flat strings such as `customer.create`.
- Passwords hashed with bcrypt, constant-time-ish login for unknown emails, `helmet`, CORS allow-list, request size limit.

### Edge cases covered

| Edge case | Behaviour |
| --- | --- |
| User logs in while their role is modified | Permissions are read per request, so the new set applies immediately |
| Role deactivated while users are logged in | Next API call returns `ROLE_INACTIVE`; the UI signs the user out with a message |
| Permission removed during an active session | The next request is denied; the UI also refreshes the profile on focus and every minute |
| User transferred to another branch with the same role | Branch scope is recalculated from the user's new branch on the next request |
| Last System Administrator modified or deactivated | Blocked with `LAST_SYSTEM_ADMIN` |

## Project structure

```
server/
  src/
    models/        Role, Permission, RolePermission, User, AuditLog, Notification
    lib/           catalog (modules/actions), access (permission + branch checks),
                   roleService (validation, diffing, audit), audit, branches
    middleware/    auth (authenticate, authorize, requireSystemAdmin), errorHandler
    routes/        roles, users, reports, auditLogs, notifications, meta, demo, auth
    scripts/seed.js
client/
  src/
    pages/         RoleList, RoleForm, RoleDetails, PermissionMatrixPage, ApprovalLevels,
                   Users, Reports, AuditLogs, AccessCheck, Login
    components/    PermissionMatrix, PermissionCompare, CloneRoleModal, Layout, ...
    context/       AuthContext, ToastContext
```

## API

All responses are `{ success: true, ... }` or `{ success: false, error: { code, message } }`. Base path: `/api`. Send `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Mock sign-in (returns JWT + profile) |
| GET | `/auth/me` | Current user with effective permissions |
| GET | `/roles` | List roles (`search`, `status`, `branchScope`, `sort`, `order`, `page`, `limit`) |
| GET | `/roles/:id` | Role details, permissions, assigned users |
| POST | `/roles` | Create role (body per the PDD request model + `permissions`) |
| PUT | `/roles/:id` | Edit role (optionally with `permissions`) |
| PATCH | `/roles/:id/status` | Activate / deactivate: `{ "status": "ACTIVE" \| "INACTIVE" }` |
| POST | `/roles/:id/clone` | Clone a role (optional `name`, `description`) |
| GET | `/permissions` | Module / action catalog |
| PUT | `/roles/:id/permissions` | Replace the role's permissions (PDD permission-update model) |
| DELETE | `/roles/:id` | Delete (blocked for assigned or protected roles) |
| GET | `/users` · PATCH `/users/:id/role` · `/branch` · `/status` | Mock users for role assignment |
| GET | `/reports/role-summary` · `permission-matrix` · `role-assignments` · `inactive-roles` | Reports |
| GET | `/audit-logs` | Audit trail (`action`, `entityId`, `page`, `limit`) |
| GET | `/notifications` · POST `/notifications/read-all` | Notifications |
| POST | `/demo/check` · GET `/demo/:module/records` | Show permission + branch enforcement |

Error codes: `DUPLICATE_ROLE_NAME`, `ROLE_NOT_FOUND`, `PERMISSION_NOT_FOUND`, `PROTECTED_ROLE`, `ROLE_ASSIGNED`, `ROLE_INACTIVE`, `INVALID_BRANCH_SCOPE`, `EMPTY_PERMISSIONS`, `LAST_SYSTEM_ADMIN`, `FORBIDDEN`, `BRANCH_SCOPE_DENIED`.

Database collections: `roles`, `permissions`, `role_permissions` (plus `users`, `audit_logs`, `notifications`).

## Run locally

Requirements: Node 18+ and a MongoDB (local or Atlas).

```bash
# 1. API
cd server
cp .env.example .env        # set MONGODB_URI and JWT_SECRET
npm install
npm run seed                # creates roles, permissions, demo users
npm run dev                 # http://localhost:5000

# 2. Web app (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173  (proxies /api to :5000)
```

## Deploy (free tier)

### 1. Database - MongoDB Atlas
1. Create a free **M0** cluster, a database user, and under *Network Access* allow `0.0.0.0/0`.
2. Copy the connection string (`mongodb+srv://...`) and add a database name, e.g. `.../rbac_access_control`.

### 2. API - Render
1. Push this repo to GitHub.
2. Render → **New Web Service** → select the repo.
   - **Root directory:** `server`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
3. Environment variables:
   - `MONGODB_URI` - your Atlas string
   - `JWT_SECRET` - a long random string
   - `CLIENT_ORIGIN` - your Vercel URL (add after step 3; no trailing slash)
4. After the first deploy, seed the database once from your own machine:
   ```bash
   cd server
   MONGODB_URI="<atlas string>" JWT_SECRET=x npm run seed
   ```
5. Check `https://<your-api>.onrender.com/api/health` returns `{"success":true,"status":"ok"}`.

> Render's free tier sleeps when idle; the first request can take ~30-50 s. Open the API URL once before sharing the link.

### 3. Web app - Vercel
1. Vercel → **Add New Project** → select the repo.
   - **Root directory:** `client`
   - Framework preset: Vite
2. Environment variable: `VITE_API_URL=https://<your-api>.onrender.com` (no trailing slash).
3. Deploy, then put the Vercel URL into `CLIENT_ORIGIN` on Render and redeploy the API.

`client/vercel.json` already rewrites all routes to `index.html` so deep links work.

## Notes and assumptions

- **Authentication, user management and branch management are out of scope** (PDD-001/003/005). Minimal mock versions (login, a user list, a fixed branch list) exist only so role assignment and enforcement can be demonstrated.
- The "business modules" (Customers, Loan, ...) are represented by the demo endpoints, which show how every module route is guarded by the same `authorize()` middleware.
- Permission checks, not JWT claims, decide access on every request, so changes never wait for a token to expire.
