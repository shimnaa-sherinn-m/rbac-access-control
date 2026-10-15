import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api.js';
import PermissionMatrix from '../components/PermissionMatrix.jsx';
import { Card, ErrorState, LoadingBlock, PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ACTIONS, ACTION_LABELS, APPROVAL_LEVELS, BRANCH_SCOPE_LABELS } from '../lib/constants.js';
import { formatCurrency } from '../lib/format.js';
import { useAsync } from '../lib/hooks.js';
import { branchName, useMeta } from '../lib/meta.js';

export default function AccessCheck() {
  const { user } = useAuth();
  const meta = useMeta();

  const [module, setModule] = useState('LOAN');
  const [action, setAction] = useState('VIEW');
  const [branchId, setBranchId] = useState('');
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const records = useAsync(() => api.get(`/demo/${module}/records`), [module, user.id, user.role.id]);

  if (meta.loading) return <LoadingBlock />;
  if (meta.error) return <ErrorState error={meta.error} />;

  async function runCheck(event) {
    event.preventDefault();
    setChecking(true);
    try {
      const res = await api.post('/demo/check', { module, action, branchId });
      setResult({ allowed: true, checks: res.checks });
    } catch (err) {
      if (err.status === 403) setResult({ allowed: false, message: err.message, checks: err.data?.checks });
      else setResult({ allowed: false, message: err.message });
    } finally {
      setChecking(false);
    }
  }

  const level = APPROVAL_LEVELS.find((l) => l.level === user?.role?.approvalLevel);
  const moduleLabel = meta.catalog.find((m) => m.module === module)?.label ?? module;

  return (
    <>
      <PageHeader title="My Access" subtitle="What your role allows. Every check below is enforced by the API, not just hidden in the interface." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Effective permissions" description={`Resolved from your role: ${user?.role?.name ?? ''}`}>
            <PermissionMatrix catalog={meta.catalog} value={user?.permissions ?? []} readOnly />
          </Card>

          <Card title="Try an action" description="Ask the backend whether your role may perform an action, optionally on a specific branch.">
            <form onSubmit={runCheck} className="grid gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="chk-module" className="label">
                  Module
                </label>
                <select id="chk-module" className="input" value={module} onChange={(e) => { setModule(e.target.value); setResult(null); }}>
                  {meta.catalog.map((m) => (
                    <option key={m.module} value={m.module}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="chk-action" className="label">
                  Action
                </label>
                <select id="chk-action" className="input" value={action} onChange={(e) => { setAction(e.target.value); setResult(null); }}>
                  {ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      {ACTION_LABELS[a]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="chk-branch" className="label">
                  Branch
                </label>
                <select id="chk-branch" className="input" value={branchId} onChange={(e) => { setBranchId(e.target.value); setResult(null); }}>
                  <option value="">Any / not specified</option>
                  {meta.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn btn-primary w-full" disabled={checking}>
                  {checking && <Spinner className="h-4 w-4 text-white" />}
                  Check access
                </button>
              </div>
            </form>

            {result && (
              <div
                className={`mt-5 flex items-start gap-3 rounded-lg border p-4 text-sm ${
                  result.allowed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
                role="status"
              >
                {result.allowed ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}
                <div>
                  <p className="font-semibold">{result.allowed ? 'Allowed (HTTP 200)' : 'Denied (HTTP 403)'}</p>
                  {!result.allowed && <p className="mt-0.5">{result.message}</p>}
                  {result.checks && (
                    <p className="mt-1 text-xs opacity-85">
                      Permission check: {result.checks.permission ? 'passed' : 'failed'} · Branch scope check: {result.checks.branchScope ? 'passed' : 'failed'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card title={`${moduleLabel} records you can see`} description="Rows are filtered on the server by your branch scope.">
            {records.loading && !records.data ? (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Spinner className="h-4 w-4" /> Loading...
              </div>
            ) : records.error ? (
              <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Denied (HTTP {records.error.status || 'error'})</p>
                  <p className="mt-0.5">{records.error.message}</p>
                </div>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-neutral-600">
                  Showing <strong className="tabular-nums">{records.data.visible}</strong> of <span className="tabular-nums">{records.data.total}</span> records.
                </p>
                <div className="flex flex-wrap gap-2">
                  {records.data.records.map((r) => (
                    <span key={r.id} className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700">
                      {r.title} · {branchName(meta.branches, r.branchId)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        <div>
          <Card title="Role summary">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-neutral-500">Signed in as</dt>
                <dd className="mt-1 font-medium text-neutral-900">{user?.name}</dd>
                <dd className="text-xs text-neutral-500">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Role</dt>
                <dd className="mt-1 font-medium text-neutral-900">{user?.role?.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Your branch</dt>
                <dd className="mt-1 text-neutral-900">{branchName(meta.branches, user?.branchId)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Branch scope</dt>
                <dd className="mt-1 text-neutral-900">{BRANCH_SCOPE_LABELS[user?.role?.branchScope]}</dd>
                {user?.role?.branchScope === 'SELECTED_BRANCHES' && <dd className="text-xs text-neutral-500">{user?.role?.branches?.map((b) => branchName(meta.branches, b)).join(', ')}</dd>}
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Approval authority</dt>
                <dd className="mt-1 text-neutral-900">{level?.label}</dd>
                {user?.role?.approvalLevel > 0 && <dd className="text-xs text-neutral-500 tabular-nums">Limit {formatCurrency(user?.role?.approvalLimit)}</dd>}
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
