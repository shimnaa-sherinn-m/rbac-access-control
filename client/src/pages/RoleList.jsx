import { ArrowDown, ArrowUp, Copy, Download, Eye, Lock, Pencil, Plus, Power, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import CloneRoleModal from '../components/CloneRoleModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { EmptyState, ErrorState, LoadingBlock, PageHeader, Pagination, StatusBadge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { BRANCH_SCOPES, BRANCH_SCOPE_LABELS } from '../lib/constants.js';
import { downloadCsv } from '../lib/csv.js';
import { formatDate } from '../lib/format.js';
import { useAsync, useDebounced } from '../lib/hooks.js';

const PAGE_SIZE = 8;

function SortHeader({ label, field, sort, order, onSort, className = '' }) {
  const active = sort === field;
  const Icon = order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`th ${className}`} aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 font-semibold text-neutral-600 hover:text-neutral-900">
        {label}
        {active && <Icon className="h-3.5 w-3.5" />}
      </button>
    </th>
  );
}

export default function RoleList() {
  const navigate = useNavigate();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);

  const [cloneTarget, setCloneTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounced(search);
  const filters = { search: debouncedSearch, status, branchScope: scope, sort, order };
  const { data, loading, error, reload } = useAsync(
    () => api.get('/roles', { ...filters, page, limit: PAGE_SIZE }),
    [debouncedSearch, status, scope, sort, order, page],
  );

  const hasFilters = Boolean(search || status || scope);
  const roles = data?.roles ?? [];

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const toggleSort = (field) => {
    if (sort === field) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(field);
      setOrder(field === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setScope('');
    setPage(1);
  };

  async function confirmStatusChange() {
    setBusy(true);
    try {
      await api.patch(`/roles/${statusTarget.role.id}/status`, { status: statusTarget.status });
      toast.success(`Role ${statusTarget.status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      setStatusTarget(null);
      reload();
    } catch (err) {
      toast.error(err.message);
      setStatusTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await api.get('/roles', { ...filters, page: 1, limit: 100 });
      downloadCsv('roles.csv', [
        ['Role Name', 'Description', 'Users Assigned', 'Status', 'Branch Scope', 'Approval Level', 'Created Date'],
        ...res.roles.map((r) => [r.name, r.description, r.userCount, r.status, BRANCH_SCOPE_LABELS[r.branchScope], r.approvalLevel, formatDate(r.createdAt)]),
      ]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Roles"
        subtitle="Reusable job definitions. Users inherit their access from the role they are assigned."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
              <Download className="h-4 w-4" /> Export
            </button>
            <Link to="/access-control/roles/new" className="btn btn-primary">
              <Plus className="h-4 w-4" /> Add role
            </Link>
          </>
        }
      />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              className="input pl-9"
              placeholder="Search by role name"
              value={search}
              onChange={changeFilter(setSearch)}
              aria-label="Search roles"
            />
          </div>
          <select className="input md:w-44" value={status} onChange={changeFilter(setStatus)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select className="input md:w-52" value={scope} onChange={changeFilter(setScope)} aria-label="Filter by branch scope">
            <option value="">All branch scopes</option>
            {BRANCH_SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

        {loading && !data ? (
          <LoadingBlock label="Loading roles..." />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : roles.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No roles match your filters' : 'No roles yet'}
            description={hasFilters ? 'Try a different search or clear the filters.' : 'Create your first role to get started.'}
            action={
              hasFilters ? (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <Link to="/access-control/roles/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" /> Add role
                </Link>
              )
            }
          />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[820px] divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <SortHeader label="Role name" field="name" sort={sort} order={order} onSort={toggleSort} />
                  <th className="th">Description</th>
                  <SortHeader label="Users assigned" field="userCount" sort={sort} order={order} onSort={toggleSort} className="text-center" />
                  <th className="th">Status</th>
                  <SortHeader label="Created date" field="createdAt" sort={sort} order={order} onSort={toggleSort} />
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 bg-white">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-neutral-50/70">
                    <td className="td">
                      <Link to={`/access-control/roles/${role.id}`} className="font-medium text-neutral-900 hover:text-brand">
                        {role.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                        {role.isSystem && (
                          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-brass-light text-brass-text border border-brass-border">
                            <Lock className="h-3 w-3 text-brass" /> Protected
                          </span>
                        )}
                        <span>{BRANCH_SCOPE_LABELS[role.branchScope]}</span>
                      </div>
                    </td>
                    <td className="td max-w-xs">
                      <p className="truncate text-neutral-500" title={role.description}>
                        {role.description || '—'}
                      </p>
                    </td>
                    <td className="td text-center tabular-nums">{role.userCount}</td>
                    <td className="td">
                      <StatusBadge status={role.status} />
                    </td>
                    <td className="td whitespace-nowrap tabular-nums">{formatDate(role.createdAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-0.5">
                        <button type="button" className="icon-btn" title="View" aria-label={`View ${role.name}`} onClick={() => navigate(`/access-control/roles/${role.id}`)}>
                          <Eye className="h-4 w-4" />
                        </button>
                        <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${role.name}`} onClick={() => navigate(`/access-control/roles/${role.id}/edit`)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className="icon-btn" title="Clone" aria-label={`Clone ${role.name}`} onClick={() => setCloneTarget(role)}>
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={`icon-btn ${role.status === 'ACTIVE' ? 'hover:!text-rose-600' : 'hover:!text-emerald-600'}`}
                          title={role.isSystem ? 'Protected role cannot be deactivated' : role.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          aria-label={`${role.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${role.name}`}
                          disabled={role.isSystem && role.status === 'ACTIVE'}
                          onClick={() => setStatusTarget({ role, status: role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && roles.length > 0 && <Pagination page={page} total={data.total} limit={PAGE_SIZE} onChange={setPage} />}
      </div>

      <CloneRoleModal
        role={cloneTarget}
        onClose={() => setCloneTarget(null)}
        onCloned={(newRole) => {
          setCloneTarget(null);
          toast.success(`Role "${newRole.name}" created`);
          navigate(`/access-control/roles/${newRole.id}`);
        }}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.status === 'ACTIVE' ? 'Activate role' : 'Deactivate role'}
        tone={statusTarget?.status === 'ACTIVE' ? 'primary' : 'danger'}
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Activate' : 'Deactivate'}
        busy={busy}
        message={
          statusTarget?.status === 'ACTIVE'
            ? `Activate "${statusTarget?.role.name}"? It can then be assigned to users.`
            : `Deactivate "${statusTarget?.role.name}"? ${
                statusTarget?.role.userCount
                  ? `${statusTarget.role.userCount} assigned user(s) will lose access immediately.`
                  : 'It will no longer be assignable to users.'
              }`
        }
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusTarget(null)}
      />
    </>
  );
}
