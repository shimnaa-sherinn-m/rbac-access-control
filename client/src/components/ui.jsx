import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';

export function StatusBadge({ status }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-300/30'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-brand ${className}`} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-neutral-500" role="status">
      <Spinner /> <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900">Unable to load data</p>
        <p className="mt-1 max-w-sm text-xs text-neutral-500">{error?.message ?? 'Please check your connection and try again.'}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-secondary px-3 py-1.5 text-xs" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <Inbox className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        {description && <p className="mt-1 max-w-sm text-xs text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold leading-tight text-neutral-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(Math.ceil(total / limit), 1);
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row">
      <p className="text-sm text-neutral-500">
        Showing <span className="font-medium text-neutral-800 tabular-nums">{from}</span>–<span className="font-medium text-neutral-800 tabular-nums">{to}</span> of{' '}
        <span className="font-medium text-neutral-800 tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-secondary px-2.5 py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-neutral-600 tabular-nums">
          Page {page} of {pages}
        </span>
        <button type="button" className="btn btn-secondary px-2.5 py-1.5" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Card({ title, description, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
