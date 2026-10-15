import { useState } from 'react';
import { api } from '../api.js';
import { EmptyState, ErrorState, LoadingBlock, PageHeader, Pagination } from '../components/ui.jsx';
import { AUDIT_ACTIONS } from '../lib/constants.js';
import { formatDateTime } from '../lib/format.js';
import { useAsync } from '../lib/hooks.js';

const PAGE_SIZE = 15;

const formatValue = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '(none)';
  if (value === null || value === undefined || value === '') return '(empty)';
  return String(value);
};

function Details({ details }) {
  if (details?.changes) {
    return (
      <ul className="space-y-1">
        {Object.entries(details.changes).map(([field, { from, to }]) => (
          <li key={field}>
            <span className="font-medium text-neutral-700">{field}</span>: <span className="text-rose-600 line-through tabular-nums">{formatValue(from)}</span> →{' '}
            <span className="text-emerald-700 tabular-nums">{formatValue(to)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (details?.added || details?.removed) {
    return (
      <div className="space-y-2">
        {details.added?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {details.added.map((p) => (
              <span key={p} className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                + {p}
              </span>
            ))}
          </div>
        )}
        {details.removed?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {details.removed.map((p) => (
              <span key={p} className="rounded bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-700">
                − {p}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (!details || Object.keys(details).length === 0) return <span className="text-neutral-400">—</span>;
  return <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-words rounded bg-neutral-50 p-2 text-xs text-neutral-600 border border-neutral-200">{JSON.stringify(details, null, 2)}</pre>;
}

export default function AuditLogs() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => api.get('/audit-logs', { action, page, limit: PAGE_SIZE }), [action, page]);

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Every change to roles, permissions, branch scope, approval levels and role assignments." />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center">
          <select
            className="input sm:w-64"
            aria-label="Filter by action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {Object.entries(AUDIT_ACTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : data.logs.length === 0 ? (
          <EmptyState title="No audit entries" description="Changes will appear here as they happen." />
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[820px] divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="th">When</th>
                  <th className="th">Action</th>
                  <th className="th">Entity</th>
                  <th className="th">By</th>
                  <th className="th">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 bg-white align-top">
                {(data.logs ?? []).map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/70">
                    <td className="td whitespace-nowrap text-neutral-500 tabular-nums">{formatDateTime(log.createdAt)}</td>
                    <td className="td">
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">{AUDIT_ACTIONS[log.action] ?? log.action}</span>
                    </td>
                    <td className="td">
                      <p className="font-medium text-neutral-900">{log.entityName || '—'}</p>
                      <p className="text-xs text-neutral-500">{log.entityType === 'USER' ? 'User' : 'Role'}</p>
                    </td>
                    <td className="td text-neutral-700">{log.performedBy}</td>
                    <td className="td text-sm">
                      <Details details={log.details} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.logs.length > 0 && <Pagination page={page} total={data.total} limit={PAGE_SIZE} onChange={setPage} />}
      </div>
    </>
  );
}
