import { EmptyState, Pagination } from './ui.jsx';

/**
 * columns: [{ key, label, render?, className?, primary?, mobile? }]
 * - primary: column used as the card title on mobile (defaults to first column)
 * - mobile:  set to false to hide a column from the mobile card view
 * - responsive: set to false to always render the table (no mobile cards)
 */
export default function Table({
  columns,
  rows,
  emptyTitle = 'No records found',
  emptyMessage = '',
  keyFn,
  page,
  pages,
  total,
  onPage,
  dense = false,
  responsive = true,
}) {
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  const rowKey = (row, i) => (keyFn ? keyFn(row, i) : row.id || row._id || i);
  const primary = columns.find((c) => c.primary) || columns[0];
  const bodyCols = columns.filter((c) => c !== primary && c.mobile !== false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {responsive && (
        <div className="divide-y divide-gray-50 sm:hidden">
          {rows.map((row, i) => (
            <div key={rowKey(row, i)} className="p-4">
              <div className="mb-2 text-sm font-semibold text-gray-900">
                {primary.render ? primary.render(row, i) : row[primary.key] ?? '—'}
              </div>
              {bodyCols.length > 0 && (
                <dl className="space-y-1.5">
                  {bodyCols.map((c) => (
                    <div key={c.key} className="flex items-start justify-between gap-4 text-sm">
                      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400">{c.label}</dt>
                      <dd className="min-w-0 break-words text-right text-gray-700">
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
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${c.className || ''}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="hover:bg-green-50/40">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 ${dense ? 'py-2' : 'py-3'} text-gray-700 ${c.className || ''}`}>
                    {c.render ? c.render(row, i) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {page && onPage && <Pagination page={page} pages={pages} total={total} onPage={onPage} />}
    </div>
  );
}
