import { ArrowRight, Pencil } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from '../components/ui.jsx';
import { APPROVAL_LEVELS } from '../lib/constants.js';
import { formatCurrency } from '../lib/format.js';
import { useAsync } from '../lib/hooks.js';

function RoleChip({ role }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <Link to={`/access-control/roles/${role.id}`} className="block truncate text-sm font-medium text-neutral-900 hover:text-brand">
          {role.name}
        </Link>
        <p className="mt-0.5 text-xs text-neutral-500 tabular-nums">
          {role.approvalLevel > 0 ? `Limit ${formatCurrency(role.approvalLimit)}` : 'No approval authority'} · {role.userCount} user{role.userCount === 1 ? '' : 's'}
          {role.status === 'INACTIVE' && <span className="ml-1 text-amber-600">· inactive</span>}
        </p>
      </div>
      <Link to={`/access-control/roles/${role.id}/edit`} className="icon-btn shrink-0" title="Edit approval settings" aria-label={`Edit ${role.name}`}>
        <Pencil className="h-4 w-4" />
      </Link>
    </li>
  );
}

function LevelColumn({ level, roles }) {
  return (
    <div className="flex-1 rounded-lg border border-neutral-200 bg-neutral-100/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-none">{level.level}</span>
        <p className="text-sm font-semibold text-neutral-900">{level.label}</p>
      </div>
      {roles.length ? (
        <ul className="space-y-2">
          {roles.map((r) => (
            <RoleChip key={r.id} role={r} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-neutral-300 px-3 py-4 text-center text-xs text-neutral-500">No roles at this level</p>
      )}
    </div>
  );
}

export default function ApprovalLevels() {
  const { data, loading, error, reload } = useAsync(() => api.get('/roles', { limit: 100, sort: 'name' }), []);

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const roles = data?.roles ?? [];
  const byLevel = (level) => roles.filter((r) => r.approvalLevel === level);
  const chain = APPROVAL_LEVELS.filter((l) => l.level > 0);

  return (
    <>
      <PageHeader
        title="Approval Levels"
        subtitle="Who can approve what. Requests move up the chain until someone with enough authority approves them."
      />

      {roles.length === 0 ? (
        <EmptyState title="No roles yet" description="Create a role to configure its approval level." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            {chain.map((level, index) => (
              <Fragment key={level.level}>
                <LevelColumn level={level} roles={byLevel(level.level)} />
                {index < chain.length - 1 && (
                  <div className="flex items-center justify-center text-neutral-400">
                    <ArrowRight className="h-5 w-5 rotate-90 lg:rotate-0" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Without approval authority</h2>
            <LevelColumn level={APPROVAL_LEVELS[0]} roles={byLevel(0)} />
          </div>

          <p className="text-xs text-neutral-500">Approval limits are reserved for future financial approvals. Change a role's level or limit from its edit screen.</p>
        </div>
      )}
    </>
  );
}
