import { ArrowLeft, Copy, Lock, Pencil, Power } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CloneRoleModal from '../components/CloneRoleModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PermissionMatrix from '../components/PermissionMatrix.jsx';
import { Card, EmptyState, ErrorState, LoadingBlock, PageHeader, StatusBadge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { AUDIT_ACTIONS, BRANCH_SCOPE_LABELS, APPROVAL_LEVELS } from '../lib/constants.js';
import { formatCurrency, formatDate, formatDateTime } from '../lib/format.js';
import { useAsync } from '../lib/hooks.js';
import { branchName, useMeta } from '../lib/meta.js';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-900">{children}</dd>
    </div>
  );
}

export default function RoleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const meta = useMeta();

  const { data, loading, error, reload } = useAsync(() => api.get(`/roles/${id}`), [id]);
  const activity = useAsync(() => api.get('/audit-logs', { entityId: id, limit: 6 }), [id]);

  const [cloning, setCloning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if ((loading && !data) || meta.loading) return <LoadingBlock />;
  if (error) {
    return (
      <>
        <Link to="/access-control/roles" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
          <ArrowLeft className="h-4 w-4" /> Back to roles
        </Link>
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  const { role, users } = data;
  const nextStatus = role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const level = APPROVAL_LEVELS.find((l) => l.level === role.approvalLevel);

  async function changeStatus() {
    setBusy(true);
    try {
      await api.patch(`/roles/${role.id}/status`, { status: nextStatus });
      toast.success(`Role ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      reload();
      activity.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <Link to="/access-control/roles" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="h-4 w-4" /> Back to roles
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {role.name}
            <StatusBadge status={role.status} />
            {role.isSystem && (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-brass-light text-brass-text border border-brass-border">
                <Lock className="h-3 w-3 text-brass" /> Protected
              </span>
            )}
          </span>
        }
        subtitle={role.description || 'No description provided.'}
        actions={
          <>
            <Link to={`/access-control/roles/${role.id}/edit`} className="btn btn-secondary">
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => setCloning(true)}>
              <Copy className="h-4 w-4" /> Clone
            </button>
            <button
              type="button"
              className={`btn ${role.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
              disabled={role.isSystem}
              title={role.isSystem ? 'Protected role cannot be deactivated' : undefined}
              onClick={() => setConfirming(true)}
            >
              <Power className="h-4 w-4" /> {role.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Permissions" description="Actions this role can perform in each module.">
            <PermissionMatrix catalog={meta.catalog} value={role.permissions} readOnly />
          </Card>

          <Card title={`Assigned users (${role.userCount})`}>
            {users.length === 0 ? (
              <EmptyState title="No users assigned" description="Assign this role to a user from the Role Assignment page." />
            ) : (
              <div className="-mx-5 -my-5 overflow-x-auto">
                <table className="w-full min-w-[480px] divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="th">Name</th>
                      <th className="th">Email</th>
                      <th className="th">Branch</th>
                      <th className="th">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/60">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-neutral-50/70">
                        <td className="td font-medium text-neutral-900">{u.name}</td>
                        <td className="td">{u.email}</td>
                        <td className="td">{branchName(meta.branches, u.branchId)}</td>
                        <td className="td">
                          <StatusBadge status={u.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Access settings">
            <dl className="space-y-4">
              <Detail label="Branch scope">
                {BRANCH_SCOPE_LABELS[role.branchScope]}
                {role.branchScope === 'SELECTED_BRANCHES' && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {role.branches.map((b) => (
                      <span key={b} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                        {branchName(meta.branches, b)}
                      </span>
                    ))}
                  </div>
                )}
              </Detail>
              <Detail label="Approval level">{level?.label ?? role.approvalLevel}</Detail>
              <Detail label="Approval limit">
                <span className="tabular-nums">{formatCurrency(role.approvalLimit)}</span>
              </Detail>
              <Detail label="Created">
                <span className="tabular-nums">{formatDate(role.createdAt)}</span>
              </Detail>
              <Detail label="Last updated">
                <span className="tabular-nums">{formatDateTime(role.updatedAt)}</span>
              </Detail>
            </dl>
          </Card>

          <Card
            title="Recent activity"
            actions={
              <Link to="/access-control/audit-logs" className="text-xs font-medium text-brand hover:text-brand-hover">
                All logs
              </Link>
            }
          >
            {activity.data?.logs?.length ? (
              <ul className="space-y-3">
                {activity.data.logs.map((log) => (
                  <li key={log.id} className="text-sm">
                    <p className="font-medium text-neutral-800">{AUDIT_ACTIONS[log.action] ?? log.action}</p>
                    <p className="text-xs text-neutral-500 tabular-nums">
                      {log.performedBy} · {formatDateTime(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">{activity.loading ? 'Loading...' : 'No activity recorded yet.'}</p>
            )}
          </Card>
        </div>
      </div>

      <CloneRoleModal
        role={cloning ? role : null}
        onClose={() => setCloning(false)}
        onCloned={(newRole) => {
          setCloning(false);
          toast.success(`Role "${newRole.name}" created`);
          navigate(`/access-control/roles/${newRole.id}`);
        }}
      />

      <ConfirmDialog
        open={confirming}
        title={nextStatus === 'ACTIVE' ? 'Activate role' : 'Deactivate role'}
        tone={nextStatus === 'ACTIVE' ? 'primary' : 'danger'}
        confirmLabel={nextStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'}
        busy={busy}
        message={
          nextStatus === 'ACTIVE'
            ? `Activate "${role.name}"? It can then be assigned to users.`
            : `Deactivate "${role.name}"? ${role.userCount ? `${role.userCount} assigned user(s) will lose access immediately.` : 'It will no longer be assignable to users.'}`
        }
        onConfirm={changeStatus}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
