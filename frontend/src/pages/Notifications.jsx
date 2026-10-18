import { useEffect, useState, useCallback } from 'react';
import { get, post } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime, statusColor } from '../utils/format.js';
import { PageHeader, Spinner, Badge, Pagination } from '../components/ui.jsx';
import { Button } from '../components/Fields.jsx';

export default function Notifications() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/notifications', { page, limit: 25, unread: filter === 'unread' ? 'true' : undefined });
      setRows(d.items || []);
      setUnread(d.unread || 0);
      setPages(d.pages);
      setTotal(d.total);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, filter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const isRead = (n) => (n.readBy || []).map(String).includes(String(user?._id));

  const markRead = async (id) => {
    await post(`/notifications/${id}/read`);
    setRows((r) => r.map((x) => (x._id === id ? { ...x, readBy: [...(x.readBy || []), user._id] } : x)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAll = async () => {
    await post('/notifications/mark-all-read');
    setRows((r) => r.map((x) => ({ ...x, readBy: [...(x.readBy || []), user._id] })));
    setUnread(0);
  };

  return (
    <div>
      <PageHeader
        title={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        subtitle="Important actions that happened in the system."
        actions={
          <div className="flex gap-2">
            {['', 'unread'].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${filter === f ? 'bg-green-600 text-white' : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {f === '' ? 'All' : 'Unread'}
              </button>
            ))}
            {total > 0 && (
              <Button variant="secondary" onClick={markAll}>Mark all read</Button>
            )}
          </div>
        }
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {rows.map((n) => {
                const read = isRead(n);
                return (
                  <li key={n._id} className={`px-4 py-3 sm:px-5 ${read ? '' : 'bg-green-50/50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {!read && <span className="h-2 w-2 rounded-full bg-green-600" />}
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.title}</p>
                          <Badge className={statusColor(n.type)}>{n.type}</Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{n.message}</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{formatDateTime(n.createdAt)}</p>
                      </div>
                      {!read && (
                        <Button variant="secondary" className="!px-3 !py-1 text-xs" onClick={() => markRead(n._id)}>
                          Mark read
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}