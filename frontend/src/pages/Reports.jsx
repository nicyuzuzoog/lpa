import { useEffect, useState, useCallback } from 'react';
import { get } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { money, formatDate, feeTypeLabel, paymentMethodLabel } from '../utils/format.js';
import { exportPdf, exportExcel, moneyFormat } from '../utils/export.js';
import { PageHeader, Spinner, Badge, Toolbar, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Button, Input, Select } from '../components/Fields.jsx';

const TABS = ['Collections', 'Payment Breakdown', 'Student Statement', 'Inventory', 'Uniforms', 'Fee Structures'];

export default function Reports() {
  const toast = useToast();
  const [tab, setTab] = useState('Collections');
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [storage, setStorage] = useState({});

  const [filters, setFilters] = useState({ academicYear: '', term: '', class: '', dateFrom: '', dateTo: '', period: 'daily', dimension: 'feeType', feeType: '', paymentMethod: '' });

  const loadRefs = useCallback(async () => {
    try {
      const [y, c] = await Promise.all([get('/academic-years'), get('/classes')]);
      setYears(y.items || []);
      setClasses(c.items || []);
    } catch (e) {
      toast.error(e.message);
    }
  }, [toast]);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  const run = useCallback(
    async (key, url, params) => {
      const data = await get(url, { ...filters, ...params });
      setStorage((s) => ({ ...s, [key]: data }));
      return data;
    },
    [filters]
  );

  useEffect(() => {
    if (tab === 'Collections') run('collections', '/reports/financial/collections', {}).then(() => {}).catch((e) => toast.error(e.message));
    if (tab === 'Payment Breakdown') run('breakdown', '/reports/financial/breakdown', {}).then(() => {}).catch((e) => toast.error(e.message));
    if (tab === 'Inventory') run('inventory', '/reports/inventory', { type: 'current' }).then(() => {}).catch((e) => toast.error(e.message));
    if (tab === 'Uniforms') run('uniforms', '/reports/uniforms', {}).then(() => {}).catch((e) => toast.error(e.message));
    if (tab === 'Fee Structures') run('feeStructures', '/reports/fees', {}).then(() => {}).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filters]);

  const activeYear = years.find((y) => y._id === filters.academicYear);

  const filterBar = (extra) => (
    <Toolbar>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Select value={filters.academicYear} onChange={(e) => setFilters({ ...filters, academicYear: e.target.value, term: '' })}>
          <option value="">All years</option>
          {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
        </Select>
        <Select value={filters.term} onChange={(e) => setFilters({ ...filters, term: e.target.value })}>
          <option value="">All terms</option>
          {(activeYear?.terms || []).map((t) => <option key={t._id || t.name} value={t.name}>{t.name}</option>)}
        </Select>
        <Select value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
        {extra}
        <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="!w-[150px]" />
        <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="!w-[150px]" />
      </div>
    </Toolbar>
  );

  const exportCols = (cols) => {
    const activeName = years.find((y) => y._id === filters.academicYear)?.name;
    return { title: tab, subtitle: `${activeName || 'All years'} · ${filters.term || 'All terms'}${filters.class ? ` · Class: ${classes.find((c) => c._id === filters.class)?.name}` : ''}`, columns: cols };
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Financial, inventory and uniform reports. Exports respect your active filters." />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 shadow-sm">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Collections' && (
        <div>
          {filterBar(
            <Select value={filters.period} onChange={(e) => setFilters({ ...filters, period: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          )}
          {!storage.collections ? (
            <Spinner />
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Total Collected" value={money(storage.collections.totals?.total)} tone="green" icon="bi-cash-coin" />
                <StatCard label="Payments" value={storage.collections.totals?.count} icon="bi-receipt-cutoff" />
                <StatCard label="Period" value={storage.collections.period} icon="bi-calendar3" />
              </div>
              <Table
                columns={[
                  { key: '_id', label: 'Period', render: (r) => <span className="font-medium">{r._id}</span> },
                  { key: 'total', label: 'Collected', className: 'text-right font-semibold text-green-700 dark:text-green-400', render: (r) => money(r.total) },
                  { key: 'count', label: 'Payments', className: 'text-right' },
                ]}
                rows={storage.collections.rows || []}
                emptyTitle="No collections in this range"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const e = exportCols([{ key: '_id', label: 'Period' }, { key: 'total', label: 'Collected', format: moneyFormat }, { key: 'count', label: 'Payments' }]);
                    exportPdf({ ...e, rows: storage.collections.rows || [], fileName: 'collections' });
                  }}
                >
                  PDF
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const e = exportCols([{ key: '_id', label: 'Period' }, { key: 'total', label: 'Collected (RWF)', format: moneyFormat }, { key: 'count', label: 'Payments' }]);
                    exportExcel({ ...e, rows: storage.collections.rows || [], fileName: 'collections', sheetName: 'Collections' });
                  }}
                >
                  Excel
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Payment Breakdown' && (
        <div>
          {filterBar(
            <Select value={filters.dimension} onChange={(e) => setFilters({ ...filters, dimension: e.target.value })}>
              <option value="feeType">By Fee Type</option>
              <option value="paymentMethod">By Payment Method</option>
              <option value="class">By Class</option>
              <option value="term">By Term</option>
            </Select>
          )}
          {!storage.breakdown ? (
            <Spinner />
          ) : (
            <>
              <Table
                columns={[
                  {
                    key: 'key',
                    label: filters.dimension === 'feeType' ? 'Fee Type' : filters.dimension === 'paymentMethod' ? 'Payment Method' : filters.dimension,
                    render: (r) => (
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {filters.dimension === 'feeType' ? feeTypeLabel(r.key) : filters.dimension === 'paymentMethod' ? paymentMethodLabel(r.key) : r.key || '—'}
                      </span>
                    ),
                  },
                  { key: 'total', label: 'Total', className: 'text-right font-semibold text-green-700 dark:text-green-400', render: (r) => money(r.total) },
                  { key: 'count', label: 'Count', className: 'text-right' },
                ]}
                rows={storage.breakdown.rows || []}
                emptyTitle="No payments found"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => { const e = exportCols([{ key: 'key', label: 'Dimension' }, { key: 'total', label: 'Total', format: moneyFormat }, { key: 'count', label: 'Count' }]); exportPdf({ ...e, rows: storage.breakdown.rows || [], fileName: 'payment-breakdown' }); }}>PDF</Button>
                <Button variant="secondary" onClick={() => { const e = exportCols([{ key: 'key', label: 'Dimension' }, { key: 'total', label: 'Total (RWF)', format: moneyFormat }, { key: 'count', label: 'Count' }]); exportExcel({ ...e, rows: storage.breakdown.rows || [], fileName: 'payment-breakdown', sheetName: 'Breakdown' }); }}>Excel</Button>
              </div>
            </>
          )}
        </div>
      )}

      <StatementTab years={years} activeYear={activeYear} filters={filters} setFilters={setFilters} toast={toast} />

      {tab === 'Inventory' && (
        <div>
          {filterBar(null)}
          {!storage.inventory ? (
            <Spinner />
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Stock Value" value={money(storage.inventory.valuation)} tone="green" icon="bi-gem" />
                <StatCard label="Items" value={storage.inventory.rows?.length} icon="bi-box-seam" />
                <StatCard label="Low Stock Items" value={storage.inventory.lowStock?.length} icon="bi-exclamation-triangle-fill" tone={(storage.inventory.lowStock?.length || 0) ? 'red' : 'green'} />
              </div>
              <Table
                columns={[
                  { key: 'name', label: 'Item', render: (r) => <span className="font-medium text-gray-900 dark:text-gray-100">{r.name}</span> },
                  { key: 'category', label: 'Category', render: (r) => r.category.replace('_', ' ') },
                  { key: 'unit', label: 'Unit' },
                  { key: 'openingStock', label: 'Opening' },
                  { key: 'currentStock', label: 'Current', className: 'text-right font-semibold' },
                  { key: 'minimumStockLevel', label: 'Min Level' },
                  { key: 'value', label: 'Value', className: 'text-right', render: (r) => money(r.currentStock * (r.unitCost || 0)) },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (r) =>
                      r.currentStock <= r.minimumStockLevel ? <Badge className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">LOW</Badge> : <Badge className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400">OK</Badge>,
                  },
                ]}
                rows={storage.inventory.rows || []}
                emptyTitle="Empty inventory"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => { const e = exportCols([{ key: 'name', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'currentStock', label: 'Current' }, { key: 'minimumStockLevel', label: 'Min Level' }, { key: 'unitCost', label: 'Unit Cost', format: moneyFormat }, { key: 'valuation', label: 'Valuation', format: moneyFormat }]); exportPdf({ ...e, rows: (storage.inventory.rows || []).map((r) => ({ ...r, valuation: r.currentStock * (r.unitCost || 0) })), fileName: 'inventory-report' }); }}>PDF</Button>
                <Button variant="secondary" onClick={() => { const e = exportCols([{ key: 'name', label: 'Item' }, { key: 'category', label: 'Category' }, { key: 'currentStock', label: 'Current' }, { key: 'minimumStockLevel', label: 'Min Level' }, { key: 'unitCost', label: 'Unit Cost (RWF)', format: moneyFormat }, { key: 'valuation', label: 'Valuation (RWF)', format: moneyFormat }]); exportExcel({ ...e, rows: (storage.inventory.rows || []).map((r) => ({ ...r, valuation: r.currentStock * (r.unitCost || 0) })), fileName: 'inventory-report', sheetName: 'Inventory' }); }}>Excel</Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Uniforms' && (
        <div>
          {filterBar(null)}
          {!storage.uniforms ? (
            <Spinner />
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Uniform Payments" value={money(storage.uniforms.totals?.collected)} tone="green" icon="bi-cash-coin" />
                <StatCard label="Students Who Paid" value={storage.uniforms.totals?.studentsPaid} icon="bi-people" />
                <StatCard label="Stock Remaining" value={storage.uniforms.totals?.stockRemaining} icon="bi-box-seam" />
              </div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Uniform Payments by Student</h2>
              <Table
                columns={[
                  { key: 'name', label: 'Student', render: (r) => <span className="font-medium text-gray-900 dark:text-gray-100">{r.name}</span> },
                  { key: 'studentId', label: 'Student ID' },
                  { key: 'total', label: 'Total Paid', className: 'text-right font-semibold text-green-700 dark:text-green-400', render: (r) => money(r.total) },
                  { key: 'count', label: 'Payments', className: 'text-right' },
                ]}
                rows={storage.uniforms.payments || []}
                emptyTitle="No uniform payments"
              />
              <h2 className="mb-2 mt-6 text-sm font-semibold text-gray-700 dark:text-gray-200">Uniform Stock by Item</h2>
              <Table
                columns={[
                  { key: 'name', label: 'Item', render: (r) => <span className="font-medium text-gray-900 dark:text-gray-100">{r.name}</span> },
                  { key: 'size', label: 'Size' },
                  { key: 'gender', label: 'Gender' },
                  { key: 'quantityReceived', label: 'Received' },
                  { key: 'quantityIssued', label: 'Issued' },
                  { key: 'quantityRemaining', label: 'Remaining', className: 'text-right font-semibold', render: (r) => <span className={r.quantityRemaining <= r.minimumStockLevel ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}>{r.quantityRemaining}</span> },
                ]}
                rows={storage.uniforms.stock || []}
                emptyTitle="No uniform stock"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => { const e = exportCols([{ key: 'studentId', label: 'Student ID' }, { key: 'name', label: 'Student' }, { key: 'total', label: 'Paid', format: moneyFormat }, { key: 'count', label: 'Payments' }]); exportPdf({ ...e, rows: storage.uniforms.payments || [], fileName: 'uniform-report' }); }}>PDF</Button>
                <Button variant="secondary" onClick={() => { const e = exportCols([{ key: 'studentId', label: 'Student ID' }, { key: 'name', label: 'Student' }, { key: 'total', label: 'Paid (RWF)', format: moneyFormat }, { key: 'count', label: 'Payments' }]); exportExcel({ ...e, rows: storage.uniforms.payments || [], fileName: 'uniform-report', sheetName: 'Uniforms' }); }}>Excel</Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Fee Structures' && (
        <div>
          {filterBar(null)}
          {!storage.feeStructures ? (
            <Spinner />
          ) : (
            <>
              <div className="mb-4">
                <StatCard label="Total Configured Fees" value={money(storage.feeStructures.total)} tone="green" icon="bi-gem" />
              </div>
              <Table
                columns={[
                  { key: 'class', label: 'Class', render: (r) => <span className="font-semibold">{r.class?.name}</span> },
                  { key: 'academicYear', label: 'Year', render: (r) => r.academicYear?.name },
                  { key: 'term', label: 'Term' },
                  { key: 'feeType', label: 'Fee Type', render: (r) => feeTypeLabel(r.feeType) },
                  { key: 'requiredAmount', label: 'Amount', className: 'text-right font-semibold', render: (r) => money(r.requiredAmount) },
                ]}
                rows={storage.feeStructures.rows || []}
                emptyTitle="No fee structures configured"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatementTab({ years, filters, setFilters, toast }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [student, setStudent] = useState(null);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) return setOptions([]);
    const t = setTimeout(async () => {
      try {
        const d = await get('/students', { search: query, limit: 8 });
        setOptions(d.items || []);
      } catch (e) {
        toast.error(e.message);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, toast]);

  const load = async (s) => {
    setStudent(s);
    setLoading(true);
    try {
      const params = { academicYear: filters.academicYear || undefined, term: filters.term || undefined };
      const d = await get(`/reports/financial/statements/${s._id}`, params);
      setStatement(d);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Select a student to see their full payment statement</p>
        {!student ? (
          <div className="relative max-w-md">
            <Input placeholder="Search student…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <StudentOptions options={options} onPick={(s) => load(s)} />
          </div>
        ) : (
          <div className="flex max-w-md items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm">
            <span className="font-medium text-gray-900 dark:text-gray-100">{student.firstName} {student.lastName}</span>
            <button onClick={() => setStudent(null)} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Change</button>
          </div>
        )}
      </div>

      {loading && <Spinner />}

      {statement && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Required" value={money(statement.summary.totalRequired)} tone="green" />
            <StatCard label="Paid" value={money(statement.summary.totalPaid)} tone="green" />
            <StatCard label="Balance" value={money(statement.summary.totalBalance)} tone={statement.summary.totalBalance > 0 ? 'amber' : 'green'} />
            <StatCard label="Status" value={statement.summary.overallStatus.replace('_', ' ')} icon="bi-clipboard-check" />
          </div>
          <Table
            columns={[
              { key: 'receiptNumber', label: 'Receipt', render: (r) => <span className="font-medium text-green-700 dark:text-green-400">{r.receiptNumber}</span> },
              { key: 'feeType', label: 'Fee Type', render: (r) => feeTypeLabel(r.feeType) },
              { key: 'amount', label: 'Amount', className: 'text-right font-semibold', render: (r) => money(r.amount) },
              { key: 'paymentMethod', label: 'Method', render: (r) => paymentMethodLabel(r.paymentMethod) },
              { key: 'balanceAfter', label: 'Balance After', className: 'text-right', render: (r) => money(r.balanceAfter) },
              { key: 'paymentDate', label: 'Date', render: (r) => formatDate(r.paymentDate) },
              { key: 'status', label: 'Status', render: (r) => <Badge className={r.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'}>{r.status}</Badge> },
            ]}
            rows={statement.payments || []}
            emptyTitle="No payments"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { exportPdf({ title: `Statement — ${student.firstName} ${student.lastName}`, subtitle: student.studentId, columns: [{ key: 'receiptNumber', label: 'Receipt' }, { key: 'feeType', label: 'Fee Type' }, { key: 'amount', label: 'Amount', format: moneyFormat }, { key: 'paymentMethod', label: 'Method' }, { key: 'balanceAfter', label: 'Balance After', format: moneyFormat }, { key: 'paymentDate', label: 'Date', format: (v) => formatDate(v) }, { key: 'status', label: 'Status' }], rows: statement.payments || [], fileName: `statement-${student.studentId}` }); }}>PDF</Button>
            <Button variant="secondary" onClick={() => { exportExcel({ columns: [{ key: 'receiptNumber', label: 'Receipt' }, { key: 'feeType', label: 'Fee Type' }, { key: 'amount', label: 'Amount (RWF)', format: moneyFormat }, { key: 'paymentMethod', label: 'Method' }, { key: 'balanceAfter', label: 'Balance After (RWF)', format: moneyFormat }, { key: 'paymentDate', label: 'Date', format: (v) => formatDate(v) }, { key: 'status', label: 'Status' }], rows: statement.payments || [], fileName: `statement-${student.studentId}`, sheetName: 'Statement' }); }}>Excel</Button>
          </div>
        </>
      )}
    </div>
  );
}

function StudentOptions({ options, onPick }) {
  if (!options.length) return null;
  return (
    <div className="absolute z-20 mt-1 w-full max-w-md overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg">
      {options.map((s) => (
        <button key={s._id} type="button" onClick={() => onPick(s)} className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-950/50">
          <span className="font-medium">{s.firstName} {s.lastName}</span>
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{s.studentId} · {s.class?.name}</span>
        </button>
      ))}
    </div>
  );
}