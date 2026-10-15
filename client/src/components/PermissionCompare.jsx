import { ACTIONS, ACTION_LABELS, ACTION_LETTERS } from '../lib/constants.js';

export default function PermissionCompare({ modules, roles }) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="th sticky left-0 bg-neutral-50">Module</th>
              {roles.map((role) => (
                <th key={role.id} className="th whitespace-nowrap text-center">
                  {role.name}
                  {role.status === 'INACTIVE' && <span className="ml-1 font-normal text-neutral-400">(inactive)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/60 bg-white">
            {modules.map((m) => (
              <tr key={m.module} className="hover:bg-neutral-50/70">
                <td className="td sticky left-0 bg-white font-medium text-neutral-900">{m.label}</td>
                {roles.map((role) => {
                  const actions = role.permissions.find((p) => p.module === m.module)?.actions ?? [];
                  return (
                    <td key={role.id} className="td text-center">
                      {actions.length ? (
                        <div className="flex flex-wrap justify-center gap-1">
                          {ACTIONS.filter((a) => actions.includes(a)).map((a) => (
                            <span
                              key={a}
                              title={ACTION_LABELS[a]}
                              className="inline-flex h-5 w-5 items-center justify-center rounded bg-brand-50 text-[11px] font-semibold text-brand ring-1 ring-brand/20"
                            >
                              {ACTION_LETTERS[a]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        {ACTIONS.map((a) => `${ACTION_LETTERS[a]} = ${ACTION_LABELS[a]}`).join('  ·  ')}
      </p>
    </div>
  );
}
