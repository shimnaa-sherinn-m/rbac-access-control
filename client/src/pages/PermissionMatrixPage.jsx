import { Lock, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import PermissionCompare from '../components/PermissionCompare.jsx';
import PermissionMatrix from '../components/PermissionMatrix.jsx';
import { Card, ErrorState, LoadingBlock, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../lib/hooks.js';
import { useMeta } from '../lib/meta.js';

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function EditByRole({ catalog }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const roles = useAsync(() => api.get('/roles', { limit: 100 }), []);
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);

  const selectedId = params.get('role') || roles.data?.roles?.[0]?.id || '';
  const detail = useAsync(() => (selectedId ? api.get(`/roles/${selectedId}`) : Promise.resolve(null)), [selectedId]);
  const role = detail.data?.role;

  useEffect(() => {
    if (role) setDraft(role.permissions);
  }, [role]);

  if (roles.loading && !roles.data) return <LoadingBlock />;
  if (roles.error) return <ErrorState error={roles.error} onRetry={roles.reload} />;

  const dirty = role ? !sameJson(draft, role.permissions) : false;
  const empty = draft.length === 0;
  const locked = Boolean(role?.isSystem);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/roles/${role.id}/permissions`, { permissions: draft });
      toast.success('Permissions updated');
      detail.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Configure permissions"
      description="Pick a role, adjust the grid, then save. Changes apply to everyone with the role immediately."
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-72">
          <label htmlFor="matrix-role" className="label">
            Role
          </label>
          <select
            id="matrix-role"
            className="input"
            value={selectedId}
            onChange={(e) => {
              if (dirty && !window.confirm('Discard unsaved permission changes?')) return;
              setParams({ role: e.target.value });
            }}
          >
            {roles.data.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.status === 'INACTIVE' ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </div>
        {role && <StatusBadge status={role.status} />}
        {dirty && <span className="text-sm font-medium text-amber-600">Unsaved changes</span>}
      </div>

      {locked && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>System Administrator permissions are fixed and cannot be changed.</p>
        </div>
      )}

      {detail.loading && !role ? (
        <LoadingBlock />
      ) : detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.reload} />
      ) : role ? (
        <>
          <PermissionMatrix catalog={catalog} value={draft} onChange={setDraft} disabled={locked} />
          {empty && !locked && <p className="field-error">A role must have at least one permission.</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" disabled={!dirty || saving} onClick={() => setDraft(role.permissions)}>
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button type="button" className="btn btn-primary" disabled={!dirty || empty || saving || locked} onClick={save}>
              {saving ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />}
              Save permissions
            </button>
          </div>
        </>
      ) : null}
    </Card>
  );
}

function CompareRoles() {
  const { data, loading, error, reload } = useAsync(() => api.get('/reports/permission-matrix'), []);
  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <Card title="All roles" description="Every module against every role at a glance.">
      <PermissionCompare modules={data.modules} roles={data.roles} />
    </Card>
  );
}

export default function PermissionMatrixPage() {
  const meta = useMeta();
  const [tab, setTab] = useState('edit');

  const tabs = [
    { key: 'edit', label: 'Edit by role' },
    { key: 'compare', label: 'Compare all roles' },
  ];

  return (
    <>
      <PageHeader title="Permission Matrix" subtitle="Configure and review what each role can do in every module." />

      <div className="mb-6 inline-flex rounded-lg border border-neutral-200 bg-white p-1 shadow-none" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t.key ? 'bg-brand text-white shadow-none' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {meta.loading ? <LoadingBlock /> : meta.error ? <ErrorState error={meta.error} /> : tab === 'edit' ? <EditByRole catalog={meta.catalog} /> : <CompareRoles />}
    </>
  );
}
