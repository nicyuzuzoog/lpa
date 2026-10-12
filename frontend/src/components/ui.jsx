export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className={`${className} animate-spin rounded-full border-2 border-green-200 border-t-green-600`} />
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message = '', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-gray-300">
        <i className="bi bi-inbox text-2xl" />
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {message && <p className="mt-1 max-w-md text-sm text-gray-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub = null, tone = 'default', icon = null }) {
  const tones = {
    default: 'border-gray-100',
    green: 'border-green-100',
    amber: 'border-amber-100',
    red: 'border-red-100',
  };
  return (
    <div className={`rounded-xl border ${tones[tone] || tones.default} bg-white p-4 shadow-sm sm:p-5`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <i className={`bi ${String(icon).startsWith('bi') ? icon : 'bi-graph-up'} text-lg`} />
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row">
      <p className="text-xs text-gray-500">
        {total} record{total === 1 ? '' : 's'} · page {page} of {Math.max(1, pages)}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Toolbar({ children }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}
