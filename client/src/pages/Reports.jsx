import { Download } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api.js';
import PermissionCompare from '../components/PermissionCompare.jsx';
import { EmptyState, ErrorState, LoadingBlock, PageHeader, StatusBadge } from '../components/ui.jsx';
import { ACTIONS, BRANCH_SCOPE_LABELS } from '../lib/constants.js';
import { downloadCsv } from '../lib/csv.js';
import { formatCurrency, formatDateTime } from '../lib/format.js';
import { useAsync } from '../lib/hooks.js';
import { branchName, useMeta } from '../lib/meta.js';

const status = (value) => (value === 'ACTIVE' || value === 'INACTIVE' ? <StatusBadge status={value} /> : value);

const REPORTS = [
  {
    key: 'role-summary',
    label: 'Role Summary',
    columns: [
      { label: 'Role', value: (r) => r.name },
      { label: 'Status', value: (r) => r.status, render: (r) => status(r.status) },
      { label: 'Branch scope', value: (r) => BRANCH_SCOPE_LABELS[r.branchScope] },
      { label: 'Approval level', value: (r) => r.approvalLevel },
      { label: 'Approval limit', value: (r) => r.approvalLimit ?? '', render: (r) => formatCurrency(r.approvalLimit) },
      { label: 'Users', value: (r) => r.users },
      { label: 'Modules', value: (r) => r.modules },
      { label: 'Permissions', value: (r) => r.permissions },
    ],
  },
  { key: 'permission-matrix', label: 'Permission Matrix' },
  {
    key: 'role-assignments',
    label: 'Role Assignment',
    columns: [
      { label: 'User', value: (r) => r.user },
      { label: 'Email', value: (r) => r.email },
      { label: 'Branch', value: (r, branches) => branchName(branches, r.branchId) },
      { label: 'User status', value: (r) => r.userStatus, render: (r) => status(r.userStatus) },
      { label: 'Role', value: (r) => r.role },
      { label: 'Role status', value: (r) => r.roleStatus, render: (r) => status(r.roleStatus) },
    ],
  },
  {
    key: 'inactive-roles',
    label: 'Inactive Roles',
    columns: [
      { label: 'Role', value: (r) => r.name },
      { label: 'Description', value: (r) => r.description },
      { label: 'Users still assigned', value: (r) => r.users },
      { label: 'Deactivated', value: (r) => formatDateTime(r.deactivatedAt) },
    ],
  },
];

function ReportView({ report, branches }) {
  const { data, loading, error, reload } = useAsync(() => api.get(`/reports/${report.key}`), [report.key]);

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const exportCsv = () => {
    if (report.key === 'permission-matrix') {
      downloadCsv('permission-matrix.csv', [
        ['Module', ...data.roles.map((r) => r.name)],
        ...data.modules.map((m) => [
          m.label,
          ...data.roles.map((r) => {
            const actions = r.permissions.find((p) => p.module === m.module)?.actions ?? [];
            return ACTIONS.filter((a) => actions.includes(a)).join(' | ');
          }),
        ]),
      ]);
      return;
    }
    downloadCsv(`${report.key}.csv`, [report.columns.map((c) => c.label), ...data.rows.map((row) => report.columns.map((c) => c.value(row, branches)))]);
  };

  const isMatrix = report.key === 'permission-matrix';
  const empty = isMatrix ? data.roles.length === 0 : data.rows.length === 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-900">{report.label}</h2>
        <button type="button" className="btn btn-secondary px-3 py-1.5 text-xs" onClick={exportCsv} disabled={empty}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {empty ? (
        <EmptyState title="Nothing to report" description={report.key === 'inactive-roles' ? 'All roles are currently active.' : 'No data available yet.'} />
      ) : isMatrix ? (
        <div className="p-5">
          <PermissionCompare modules={data.modules} roles={data.roles} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                {report.columns.map((c) => (
                  <th key={c.label} className="th">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 bg-white">
              {(data.rows ?? []).map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50/70">
                  {report.columns.map((c) => (
                    <td key={c.label} className="td tabular-nums">
                      {c.render ? c.render(row) : c.value(row, branches)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const meta = useMeta();
  const [active, setActive] = useState(REPORTS[0].key);
  const report = REPORTS.find((r) => r.key === active);

  return (
    <>
      <PageHeader title="Reports" subtitle="Role and access reports. Export any report as CSV." />

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-none sm:inline-flex" role="tablist">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={active === r.key}
            onClick={() => setActive(r.key)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
              active === r.key ? 'bg-brand text-white shadow-none' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {meta.loading ? <LoadingBlock /> : <ReportView report={report} branches={meta.branches} />}
    </>
  );
}
