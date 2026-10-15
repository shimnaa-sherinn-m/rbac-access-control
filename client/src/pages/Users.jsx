import { Info } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api.js';
import { ErrorState, LoadingBlock, PageHeader, StatusBadge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../lib/hooks.js';
import { useMeta } from '../lib/meta.js';

export default function Users() {
  const toast = useToast();
  const meta = useMeta();
  const users = useAsync(() => api.get('/users'), []);
  const roles = useAsync(() => api.get('/roles', { limit: 100 }), []);
  const [pending, setPending] = useState(null);

  async function run(userId, field, request, successMessage) {
    setPending(`${userId}:${field}`);
    try {
      await request();
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPending(null);
      users.reload();
      roles.reload();
    }
  }

  const assignRole = (user, roleId) => run(user.id, 'role', () => api.patch(`/users/${user.id}/role`, { roleId }), `Role updated for ${user.name}`);
  const changeBranch = (user, branchId) => run(user.id, 'branch', () => api.patch(`/users/${user.id}/branch`, { branchId }), `${user.name} transferred`);
  const toggleStatus = (user) =>
    run(user.id, 'status', () => api.patch(`/users/${user.id}/status`, { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }), `${user.name} ${user.status === 'ACTIVE' ? 'deactivated' : 'activated'}`);

  if ((users.loading && !users.data) || (roles.loading && !roles.data) || meta.loading) return <LoadingBlock />;
  const error = users.error ?? roles.error ?? meta.error;
  if (error) return <ErrorState error={error} onRetry={() => { users.reload(); roles.reload(); }} />;

  const activeRoles = roles.data.roles.filter((r) => r.status === 'ACTIVE');

  return (
    <>
      <PageHeader title="Role Assignment" subtitle="Assign a role to a user. The user inherits all permissions, branch scope and approval authority from it." />

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>
          These are mock users for demonstration. Only <strong>active</strong> roles can be assigned, and at least one active System Administrator must always
          exist.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="th">User</th>
              <th className="th">Branch</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th text-right">Account</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60 bg-white">
            {(users.data?.users ?? []).map((user) => {
              const roleOptions = user.role && !activeRoles.some((r) => r.id === user.role.id) ? [user.role, ...activeRoles] : activeRoles;
              return (
                <tr key={user.id} className="hover:bg-neutral-50/70">
                  <td className="td">
                    <p className="font-medium text-neutral-900">{user.name}</p>
                    <p className="text-xs text-neutral-500">{user.email}</p>
                  </td>
                  <td className="td">
                    <select
                      className="input h-8 py-1 text-xs"
                      aria-label={`Branch for ${user.name}`}
                      value={user.branchId}
                      disabled={pending === `${user.id}:branch`}
                      onChange={(e) => changeBranch(user, e.target.value)}
                    >
                      {meta.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="td">
                    <select
                      className="input h-8 py-1 text-xs"
                      aria-label={`Role for ${user.name}`}
                      value={user.role?.id ?? ''}
                      disabled={pending === `${user.id}:role`}
                      onChange={(e) => assignRole(user, e.target.value)}
                    >
                      {roleOptions.map((r) => (
                        <option key={r.id} value={r.id} disabled={r.status === 'INACTIVE'}>
                          {r.name}
                          {r.status === 'INACTIVE' ? ' (inactive)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="td">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="td text-right">
                    <button type="button" className="btn btn-secondary px-2.5 py-1 text-xs" disabled={pending === `${user.id}:status`} onClick={() => toggleStatus(user)}>
                      {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
