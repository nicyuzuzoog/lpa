import { useEffect, useState, useCallback } from 'react';
import { get } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime } from '../utils/format.js';
import { PageHeader, Spinner, Badge, Toolbar, EmptyState } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Input, Select, Button } from '../components/Fields.jsx';
import { exportPdf, exportExcel } from '../utils/export.js';

const MODULES = ['AUTH', 'USERS', 'CLASSES', 'ACADEMIC_YEARS', 'STUDENTS', 'FEES', 'FEE_ITEMS', 'PAYMENTS', 'INVENTORY', 'UNIFORMS', 'SETTINGS'];

export default function AuditLog() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ module: '', action: '', dateFrom: '', dateTo: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/audit-logs', { ...filters, page, limit: 30 });
      setRows(d.items || []);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const doPdf = () =>
    exportPdf({
      title: 'Audit Log',
      subtitle: 'Critical system changes',
      columns: [
        { key: 'user', label: 'User', format: (v, r) => r.userObj || '—' },
        { key: 'action', label: 'Action' },
        { key: 'module', label: 'Module' },
        { key: 'recordLabel', label: 'Record' },
        { key: 'createdAt', label: 'Timestamp', format: (v) => formatDateTime(v) },
      ],
      rows: rows.map((r) => ({ ...r, userObj: r.user?.fullName || r.user?.username || '—' })),
      fileName: 'audit-log',
    });
  const doExcel = () =>
    exportExcel({
      columns: [
        { key: 'userObj', label: 'User' },
        { key: 'action', label: 'Action' },
        { key: 'module', label: 'Module' },
        { key: 'recordLabel', label: 'Record' },
        { key: 'reason', label: 'Reason' },
        { key: 'createdAt', label: 'Timestamp', format: (v) => formatDateTime(v) },
      ],
      rows: rows.map((r) => ({ ...r, userObj: r.user?.fullName || r.user?.username || '—' })),
      fileName: 'audit-log',
      sheetName: 'Audit Logs',
    });

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Every important change is tracked here and can never be deleted through the interface."
        actions={
          <>
            <Button variant="secondary" onClick={doPdf}>PDF</Button>
            <Button variant="secondary" onClick={doExcel}>Excel</Button>
          </>
        }
      />

      <Toolbar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Select value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value })}>
            <option value="">All modules</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input placeholder="Filter action…" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="max-w-[180px]" />
          <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="!w-[150px]" />
          <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="!w-[150px]" />
        </div>
      </Toolbar>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="No audit entries" message="Changes made to sensitive records appear here." />
      ) : (
        <Table
          columns={[
            { key: 'user', label: 'User', render: (r) => <span className="font-medium">{r.user?.fullName || r.user?.username || '—'}</span> },
            { key: 'action', label: 'Action', render: (r) => <Badge className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400">{r.action}</Badge> },
            { key: 'module', label: 'Module', render: (r) => <span className="text-gray-500 dark:text-gray-400">{r.module}</span> },
            { key: 'recordLabel', label: 'Record', render: (r) => r.recordLabel || '—' },
            { key: 'values', label: 'Change', render: (r) => {
              const changed = r.newValue && typeof r.newValue === 'object' && !Array.isArray(r.newValue) && Object.keys(r.newValue).length;
              if (changed && r.newValue.from !== undefined && r.newValue.to !== undefined) {
                return <span className="text-xs">from <b>{JSON.stringify(r.newValue.from)}</b> → <b>{JSON.stringify(r.newValue.to)}</b></span>;
              }
              if (r.oldValue || r.newValue) {
                return <span className="text-xs text-gray-400 dark:text-gray-500">{r.oldValue ? 'Δ' : ''} {r.reason}</span>;
              }
              return <span className="text-gray-300 dark:text-gray-600">—</span>;
            } },
            { key: 'createdAt', label: 'Timestamp', render: (r) => <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(r.createdAt)}</span> },
          ]}
          rows={rows}
          page={page}
          pages={pages}
          total={total}
          onPage={setPage}
        />
      )}
    </div>
  );
}