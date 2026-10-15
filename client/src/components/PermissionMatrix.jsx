import { Check } from 'lucide-react';
import { ACTIONS, ACTION_LABELS } from '../lib/constants.js';

export default function PermissionMatrix({ catalog, value, onChange, readOnly = false, disabled = false }) {
  const editable = !readOnly && !disabled;
  const selected = new Map(value.map((entry) => [entry.module, new Set(entry.actions)]));

  const copy = () => new Map([...selected].map(([module, set]) => [module, new Set(set)]));

  const emit = (map) =>
    onChange(
      catalog
        .map((m) => ({ module: m.module, actions: m.actions.filter((a) => map.get(m.module)?.has(a)) }))
        .filter((entry) => entry.actions.length > 0),
    );

  const toggleCell = (module, action) => {
    const next = copy();
    const set = next.get(module) ?? new Set();
    if (set.has(action)) set.delete(action);
    else set.add(action);
    next.set(module, set);
    emit(next);
  };

  const toggleRow = (m) => {
    const next = copy();
    const set = next.get(m.module) ?? new Set();
    next.set(m.module, m.actions.every((a) => set.has(a)) ? new Set() : new Set(m.actions));
    emit(next);
  };

  const toggleColumn = (action) => {
    const applicable = catalog.filter((m) => m.actions.includes(action));
    const allOn = applicable.every((m) => selected.get(m.module)?.has(action));
    const next = copy();
    applicable.forEach((m) => {
      const set = next.get(m.module) ?? new Set();
      if (allOn) set.delete(action);
      else set.add(action);
      next.set(m.module, set);
    });
    emit(next);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full min-w-[680px] divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th className="th">Module</th>
            {ACTIONS.map((action) => (
              <th key={action} className="th text-center">
                {editable ? (
                  <button
                    type="button"
                    onClick={() => toggleColumn(action)}
                    className="font-semibold text-neutral-600 hover:text-brand"
                    title={`Toggle ${ACTION_LABELS[action]} for all modules`}
                  >
                    {ACTION_LABELS[action]}
                  </button>
                ) : (
                  ACTION_LABELS[action]
                )}
              </th>
            ))}
            {editable && <th className="th text-center">All</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200/60 bg-white">
          {catalog.map((m) => {
            const set = selected.get(m.module) ?? new Set();
            return (
              <tr key={m.module} className="hover:bg-neutral-50/70">
                <td className="td font-medium text-neutral-900">{m.label}</td>
                {ACTIONS.map((action) => {
                  let cell;
                  if (!m.actions.includes(action)) {
                    cell = <span className="inline-block font-semibold text-neutral-300 select-none" aria-label="Not applicable">—</span>;
                  } else if (editable) {
                    cell = (
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-1 focus:ring-brand focus:ring-offset-0"
                        checked={set.has(action)}
                        onChange={() => toggleCell(m.module, action)}
                        aria-label={`${m.label}: ${ACTION_LABELS[action]}`}
                      />
                    );
                  } else if (set.has(action)) {
                    cell = (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-brand text-white shadow-none" aria-label="Granted">
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                    );
                  } else {
                    cell = <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-300" aria-label="Not granted" />;
                  }
                  return (
                    <td key={action} className="td text-center">
                      {cell}
                    </td>
                  );
                })}
                {editable && (
                  <td className="td text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-1 focus:ring-brand focus:ring-offset-0"
                      checked={m.actions.every((a) => set.has(a))}
                      onChange={() => toggleRow(m)}
                      aria-label={`${m.label}: all actions`}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
