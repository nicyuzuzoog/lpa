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
      <div className={`${className} animate-spin rounded-full border-2 border-green-200 border-t-green-600 dark:border-gray-700 dark:border-t-green-500`} />
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message = '', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-gray-300 dark:bg-gray-800 dark:text-gray-600">
        <i className="bi bi-inbox text-2xl" />
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      {message && <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONE_ICON = {
  default: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-950/60 dark:text-green-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
};

const TONE_BORDER = {
  default: 'border-gray-100 dark:border-gray-800',
  green: 'border-green-100 dark:border-green-900/60',
  amber: 'border-amber-100 dark:border-amber-900/60',
  red: 'border-red-100 dark:border-red-900/60',
  blue: 'border-blue-100 dark:border-blue-900/60',
};

export function StatCard({ label, value, sub = null, tone = 'default', icon = null }) {
  return (
    <div className={`rounded-xl border ${TONE_BORDER[tone] || TONE_BORDER.default} bg-white p-4 shadow-sm dark:bg-gray-900 sm:p-5`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_ICON[tone] || TONE_ICON.default}`}>
            <i className={`bi ${String(icon).startsWith('bi') ? icon : 'bi-graph-up'} text-lg`} />
          </span>
        )}
      </div>
      <p className="mt-2 break-words text-lg font-bold leading-tight text-gray-900 dark:text-gray-100 sm:text-2xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {total} record{total === 1 ? '' : 's'} · page {page} of {Math.max(1, pages)}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Previous
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Toolbar({ children }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
      {children}
    </div>
  );
}
