import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import PermissionMatrix from '../components/PermissionMatrix.jsx';
import { Card, ErrorState, LoadingBlock, PageHeader, Spinner } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { APPROVAL_LEVELS, BRANCH_SCOPES } from '../lib/constants.js';
import { useAsync } from '../lib/hooks.js';
import { useMeta } from '../lib/meta.js';

const EMPTY_FORM = {
  name: '',
  description: '',
  status: 'ACTIVE',
  branchScope: 'ASSIGNED_BRANCH',
  branches: [],
  approvalLevel: 0,
  approvalLimit: '',
  permissions: [],
};

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Role name is required';
  else if (name.length > 100) errors.name = 'Role name must be 100 characters or fewer';
  if (form.description.length > 500) errors.description = 'Description must be 500 characters or fewer';
  if (form.branchScope === 'SELECTED_BRANCHES' && form.branches.length === 0) errors.branches = 'Select at least one branch';
  if (form.approvalLevel > 0 && form.approvalLimit !== '' && !(Number(form.approvalLimit) >= 0)) {
    errors.approvalLimit = 'Enter a valid amount (0 or more)';
  }
  if (form.permissions.length === 0) errors.permissions = 'Grant at least one permission';
  return errors;
}

function FieldError({ id, message }) {
  return message ? (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}

export default function RoleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const meta = useMeta();

  const loaded = useAsync(() => (isEdit ? api.get(`/roles/${id}`) : Promise.resolve(null)), [id]);
  const role = loaded.data?.role;

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!role) return;
    setForm({
      name: role.name,
      description: role.description,
      status: role.status,
      branchScope: role.branchScope,
      branches: role.branches,
      approvalLevel: role.approvalLevel,
      approvalLimit: role.approvalLimit ?? '',
      permissions: role.permissions,
    });
  }, [role]);

  const locked = isEdit && Boolean(role?.isSystem);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  };

  const toggleBranch = (branchId) =>
    update({ branches: form.branches.includes(branchId) ? form.branches.filter((b) => b !== branchId) : [...form.branches, branchId] });

  async function onSubmit(event) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      branchScope: form.branchScope,
      branches: form.branchScope === 'SELECTED_BRANCHES' ? form.branches : [],
      approvalLevel: Number(form.approvalLevel),
      approvalLimit: Number(form.approvalLevel) > 0 && form.approvalLimit !== '' ? Number(form.approvalLimit) : null,
      permissions: form.permissions,
    };

    setSaving(true);
    try {
      const res = isEdit ? await api.put(`/roles/${id}`, payload) : await api.post('/roles', payload);
      toast.success(isEdit ? 'Role updated' : 'Role created');
      navigate(`/access-control/roles/${res.role.id}`);
    } catch (err) {
      const fieldByCode = {
        DUPLICATE_ROLE_NAME: 'name',
        INVALID_BRANCH_SCOPE: 'branches',
        EMPTY_PERMISSIONS: 'permissions',
      };
      if (fieldByCode[err.code]) setErrors({ [fieldByCode[err.code]]: err.message });
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const title = isEdit ? 'Edit role' : 'Create role';
  if (meta.loading || (isEdit && loaded.loading && !loaded.data)) return <LoadingBlock />;
  if (meta.error || loaded.error) return <ErrorState error={meta.error ?? loaded.error} onRetry={loaded.reload} />;

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={title}
        subtitle={isEdit ? `Update ${role?.name}. Permission changes apply to assigned users immediately.` : 'Define a reusable role and the access it grants.'}
      />

      {locked && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>System Administrator is a protected role.</strong> Its name, status, permissions, branch scope and approval settings are fixed so the
            system can never be locked out. Only the description can be edited.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <Card title="General information">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="role-name" className="label">
                Role name <span className="text-rose-500">*</span>
              </label>
              <input
                id="role-name"
                className={`input ${errors.name ? 'input-error' : ''}`}
                value={form.name}
                maxLength={100}
                disabled={locked}
                placeholder="e.g. Branch Manager"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'role-name-error' : undefined}
                onChange={(e) => update({ name: e.target.value })}
              />
              <FieldError id="role-name-error" message={errors.name} />
            </div>
            <div>
              <label htmlFor="role-status" className="label">
                Status
              </label>
              <select id="role-status" className="input" value={form.status} disabled={locked} onChange={(e) => update({ status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <p className="mt-1.5 text-xs text-neutral-500">Inactive roles cannot be assigned to users.</p>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="role-description" className="label">
                Description
              </label>
              <textarea
                id="role-description"
                rows={3}
                maxLength={500}
                className={`input min-h-[80px] ${errors.description ? 'input-error' : ''}`}
                value={form.description}
                placeholder="What is this role responsible for?"
                onChange={(e) => update({ description: e.target.value })}
              />
              <div className="mt-1.5 flex justify-between">
                <FieldError message={errors.description} />
                <span className="ml-auto text-xs text-neutral-400 tabular-nums">{form.description.length}/500</span>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="Module permissions"
          description="Choose what this role can do in each module. Dashes mark actions that do not apply to a module."
          actions={<span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 tabular-nums">{form.permissions.reduce((n, p) => n + p.actions.length, 0)} granted</span>}
        >
          <PermissionMatrix catalog={meta.catalog} value={form.permissions} onChange={(permissions) => update({ permissions })} disabled={locked} />
          <FieldError message={errors.permissions} />
        </Card>

        <Card title="Branch scope" description="Which branch data users with this role can see and act on.">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="role-scope" className="label">
                Scope
              </label>
              <select id="role-scope" className="input" value={form.branchScope} disabled={locked} onChange={(e) => update({ branchScope: e.target.value })}>
                {BRANCH_SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {form.branchScope === 'SELECTED_BRANCHES' && (
              <fieldset className="md:col-span-2">
                <legend className="label">
                  Branches <span className="text-rose-500">*</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {meta.branches.map((branch) => (
                    <label
                      key={branch.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                        form.branches.includes(branch.id)
                          ? 'border-brand bg-brand-50/60 text-brand-900'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-1 focus:ring-brand focus:ring-offset-0"
                        checked={form.branches.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                      />
                      {branch.name}
                    </label>
                  ))}
                </div>
                <FieldError message={errors.branches} />
              </fieldset>
            )}
          </div>
        </Card>

        <Card title="Approval settings" description="Approval authority for maker-checker workflows.">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="role-level" className="label">
                Approval level
              </label>
              <select
                id="role-level"
                className="input"
                value={form.approvalLevel}
                disabled={locked}
                onChange={(e) => update({ approvalLevel: Number(e.target.value), ...(Number(e.target.value) === 0 ? { approvalLimit: '' } : {}) })}
              >
                {APPROVAL_LEVELS.map((l) => (
                  <option key={l.level} value={l.level}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="role-limit" className="label">
                Approval limit <span className="font-normal text-neutral-400">(optional, INR)</span>
              </label>
              <input
                id="role-limit"
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                className={`input tabular-nums ${errors.approvalLimit ? 'input-error' : ''}`}
                value={form.approvalLimit}
                disabled={locked || Number(form.approvalLevel) === 0}
                placeholder={Number(form.approvalLevel) === 0 ? 'Not applicable' : 'e.g. 500000'}
                onChange={(e) => update({ approvalLimit: e.target.value })}
              />
              <FieldError message={errors.approvalLimit} />
              <p className="mt-1.5 text-xs text-neutral-500">Reserved for future financial approvals.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-100/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Link to={isEdit ? `/access-control/roles/${id}` : '/access-control/roles'} className="btn btn-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <Spinner className="h-4 w-4 text-white" />}
          {isEdit ? 'Save changes' : 'Create role'}
        </button>
      </div>
    </form>
  );
}
