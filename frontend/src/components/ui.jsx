export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ${className}`}>
      {children}
    </span>
  );
}

export function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className={`${className} animate-spin rounded-full border-2 border-gold-200 border-t-gold-500 dark:border-ink-700 dark:border-t-gold-400`} />
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message = '', action = null }) {
  return (
    <div className="lux-card flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center">
      <img src="/img/crest.svg" alt="" aria-hidden="true" className="mb-4 h-14 w-14 opacity-90" />
      <p className="font-display text-lg font-semibold text-ink-800 dark:text-cream-100">{title}</p>
      {message && <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 dark:text-cream-50 sm:text-3xl">{title}</h1>
        <div className="lux-rule mt-2 w-24" />
        {subtitle && <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONE_ICON = {
  default: 'bg-gray-100 text-gray-500 dark:bg-ink-800 dark:text-gray-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  amber: 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
};

const TONE_VALUE = {
  default: 'text-ink-900 dark:text-cream-50',
  green: 'text-emerald-800 dark:text-emerald-200',
  amber: 'text-gold-700 dark:text-gold-300',
  red: 'text-red-700 dark:text-red-300',
  blue: 'text-blue-800 dark:text-blue-200',
};

export function StatCard({ label, value, sub = null, tone = 'default', icon = null }) {
  return (
    <div className="lux-card lux-topline group rounded-2xl p-4 transition-transform duration-300 hover:-translate-y-0.5 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="lux-eyebrow">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE_ICON[tone] || TONE_ICON.default}`}>
            <i className={`bi ${String(icon).startsWith('bi') ? icon : 'bi-graph-up'} text-base`} />
          </span>
        )}
      </div>
      <p className={`mt-3 break-words font-display text-2xl font-semibold leading-tight sm:text-3xl ${TONE_VALUE[tone] || TONE_VALUE.default}`}>{value}</p>
      {sub && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t border-gold-100/70 px-4 py-3 sm:flex-row dark:border-ink-700">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {total} record{total === 1 ? '' : 's'} · page {page} of {Math.max(1, pages)}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-gold-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-gold-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:bg-ink-800 dark:text-cream-100 dark:hover:bg-ink-700"
        >
          Previous
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="rounded-lg border border-gold-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-gold-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:bg-ink-800 dark:text-cream-100 dark:hover:bg-ink-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Toolbar({ children }) {
  return (
    <div className="lux-card mb-4 flex flex-col gap-2 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}
