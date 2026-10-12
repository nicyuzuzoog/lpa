import { EmptyState, Pagination } from './ui.jsx';

/**
 * columns: [{ key, label, render?, className? }]
 */
export default function Table({ columns, rows, emptyTitle = 'No records found', emptyMessage = '', keyFn, page, pages, total, onPage, dense = false }) {
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="scroll-thin overflow-x-auto">
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
              <tr key={keyFn ? keyFn(row, i) : row.id || row._id || i} className="hover:bg-green-50/40">
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
