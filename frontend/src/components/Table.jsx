import { EmptyState, Pagination } from './ui.jsx';

/**
 * columns: [{ key, label, render?, className?, primary?, mobile? }]
 * - primary: column used as the card title on mobile (defaults to first column)
 * - mobile:  set to false to hide a column from the mobile card view
 * - responsive: set to false to always render the table (no mobile cards)
 */
export default function Table({
  columns, rows, emptyTitle = 'No records found', emptyMessage = '',
  keyFn, page, pages, total, onPage, dense = false, responsive = true, rowClassName,
}) {
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  const rowKey = (row, i) => (keyFn ? keyFn(row, i) : row.id || row._id || i);
  const primary = columns.find((c) => c.primary) || columns[0];
  const bodyCols = columns.filter((c) => c !== primary && c.mobile !== false);

  return (
    <div className="lux-card overflow-hidden rounded-2xl">
      {responsive && (
        <div className="divide-y divide-gold-100/60 sm:hidden dark:divide-ink-800">
          {rows.map((row, i) => (
            <div key={rowKey(row, i)} className={`p-4 ${rowClassName ? rowClassName(row, i) : ''}`}>
              <div className="mb-2 text-sm font-semibold text-ink-900 dark:text-cream-50">
                {primary.render ? primary.render(row, i) : row[primary.key] ?? '—'}
              </div>
              {bodyCols.length > 0 && (
                <dl className="space-y-1.5">
                  {bodyCols.map((c) => (
                    <div key={c.key} className="flex items-start justify-between gap-4 text-sm">
                      <dt className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{c.label}</dt>
                      <dd className="min-w-0 break-words text-right text-gray-700 dark:text-gray-300">
                        {c.render ? c.render(row, i) : row[c.key] ?? '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={`scroll-thin overflow-x-auto ${responsive ? 'hidden sm:block' : ''}`}>
        <table className="min-w-full divide-y divide-gold-100/70 text-sm dark:divide-ink-800">
          <thead className="bg-cream-100/80 dark:bg-ink-800/70">
            <tr>
              {columns.map((c) => (
                <th key={c.key}
                  className={`whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-700 dark:text-gold-400 ${c.className || ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-100/50 dark:divide-ink-800/70">
            {rows.map((row, i) => {
              const extra = rowClassName ? rowClassName(row, i) : '';
              return (
                <tr key={rowKey(row, i)} className={extra ? `${extra} transition-colors hover:bg-gold-50/60 dark:hover:bg-ink-800/40` : 'transition-colors hover:bg-gold-50/60 dark:hover:bg-ink-800/40'}>
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 ${dense ? 'py-2' : 'py-3'} text-gray-700 dark:text-gray-300 ${c.className || ''}`}>
                      {c.render ? c.render(row, i) : row[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {page && onPage && <Pagination page={page} pages={pages} total={total} onPage={onPage} />}
    </div>
  );
}
