import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { money, statusColor, isRedStatus } from '../utils/format.js';
import { exportPdf, exportExcel, moneyFormat } from '../utils/export.js';
import { PageHeader, Spinner, Badge, Toolbar, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Button, Input, Select } from '../components/Fields.jsx';

const EMPTY_FILTERS = { search: '', class: '', academicYear: '', term: '', status: '' };

const studentName = (r) => r.name || `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || '—';
const studentIdOf = (r) => r.studentId || r.student?.studentId || '';
const classNameOf = (r) => r.class || r.student?.class?.name || '';

const rowFlag = (r) => (isRedStatus(r.status) ? 'bg-red-50/80 ring-1 ring-inset ring-red-100 dark:bg-red-950/30 dark:ring-red-900' : '');

export default function LowPayers() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ required: 0, paid: 0, balance: 0 });
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [order, setOrder] = useState('asc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/payments/balances', filters);
      setRows(d.items);
      setTotals(d.totals);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    Promise.all([get('/academic-years'), get('/classes')])
      .then(([y, c]) => {
        setYears(y.items || []);
        setClasses(c.items || []);
        const active = (y.items || []).find((x) => x.isActive);
        if (active) {
          setFilters((f) => ({
            ...f,
            academicYear: active._id,
            term: active.terms?.find((t) => t.status === 'ACTIVE')?.name || active.terms?.[0]?.name || '',
          }));
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const ranked = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const diff = (a.paid || 0) - (b.paid || 0);
      if (diff !== 0) return order === 'asc' ? diff : -diff;
      return studentName(a).localeCompare(studentName(b));
    });
    return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [rows, order]);

  const redRows = ranked.filter((r) => isRedStatus(r.status));
  const unpaidCount = ranked.filter((r) => r.status === 'UNPAID').length;
  const lowest = ranked.length ? Math.min(...ranked.map((r) => r.paid || 0)) : 0;
  const average = ranked.length ? Math.round(ranked.reduce((a, r) => a + (r.paid || 0), 0) / ranked.length) : 0;
  const activeYear = years.find((y) => y._id === filters.academicYear);
  const yearName = activeYear?.name;

  const hasFilters = Object.values(filters).some((v) => v !== '');
  const clearFilters = () => {
    setSearchInput('');
    setFilters((f) => ({ ...EMPTY_FILTERS, academicYear: f.academicYear, term: f.term }));
  };

  const exportColumns = [
    { key: 'rank', label: 'Rank' },
    { key: 'studentId', label: 'Student ID', format: (v, r) => studentIdOf(r) },
    { key: 'name', label: 'Student Name', format: (v, r) => studentName(r) },
    { key: 'class', label: 'Class', format: (v, r) => classNameOf(r) },
    { key: 'required', label: 'Required (RWF)', format: moneyFormat },
    { key: 'paid', label: 'Paid (RWF)', format: moneyFormat },
    { key: 'balance', label: 'Balance (RWF)', format: moneyFormat },
    { key: 'status', label: 'Status' },
  ];

  const subtitle = `${yearName || 'All years'} · ${filters.term || 'All terms'} · Ranked by amount paid (${order === 'asc' ? 'lowest first' : 'highest first'}). Required = school fees + school supplies only; uniform is optional.`;

  const doPdf = () =>
    exportPdf({ title: 'Students Ranked by Payment', subtitle, columns: exportColumns, rows: ranked, fileName: 'payment-ranking' }).catch((e) =>
      toast.error(e.message)
    );

  const doExcel = () =>
    exportExcel({
      title: 'Students Ranked by Payment',
      subtitle,
      columns: exportColumns,
      rows: ranked,
      fileName: 'payment-ranking',
      sheetName: 'Ranking',
    }).catch((e) => toast.error(e.message));

  return (
    <div>
      <PageHeader
        title="Payment Ranking"
        subtitle="Students ranked by how much they have paid — smallest payments first. Required amounts cover school supplies and school fees only; uniform is optional and excluded."
        actions={
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 text-sm">
            <button
              onClick={() => setOrder('asc')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${order === 'asc' ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Lowest first
            </button>
            <button
              onClick={() => setOrder('desc')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${order === 'desc' ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Highest first
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Lowest Payment" value={money(lowest)} icon="bi-arrow-down-circle" tone={unpaidCount ? 'red' : 'green'} />
        <StatCard label="Average Paid" value={money(average)} icon="bi-cash-coin" tone="green" />
        <StatCard
          label="Unpaid Students"
          value={unpaidCount}
          icon="bi-exclamation-triangle"
          tone={unpaidCount ? 'red' : 'green'}
          sub={unpaidCount ? 'Shown in red below' : 'None'}
        />
        <StatCard label="Students Ranked" value={ranked.length} icon="bi-people" />
      </div>

      <Toolbar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search name or ID… e.g. Amina"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-[200px]"
          />
          <Select value={filters.academicYear} onChange={(e) => setFilters({ ...filters, academicYear: e.target.value, term: '' })}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y._id} value={y._id}>
                {y.name}
              </option>
            ))}
          </Select>
          <Select value={filters.term} onChange={(e) => setFilters({ ...filters, term: e.target.value })}>
            <option value="">All terms</option>
            {(activeYear?.terms || []).map((t) => (
              <option key={t._id || t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
              Clear filters
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={doPdf}>
            <i className="bi bi-file-earmark-pdf" /> PDF
          </Button>
          <Button variant="secondary" onClick={doExcel}>
            <i className="bi bi-file-earmark-excel" /> Excel
          </Button>
        </div>
      </Toolbar>

      {redRows.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
          <i className="bi bi-exclamation-octagon-fill" />
          <span>
            <strong>{redRows.length}</strong> student{redRows.length === 1 ? '' : 's'} with a red status (no payment received) — highlighted below.
          </span>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <Table
          columns={[
            {
              key: 'rank',
              label: '#',
              className: 'w-12 text-center font-bold text-gray-400 dark:text-gray-500',
              render: (r) => r.rank,
            },
            {
              key: 'student',
              label: 'Student',
              render: (r) => (
                <Link to={`/app/students/${r.student._id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-green-700">
                  {studentName(r)}
                  <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({studentIdOf(r)})</span>
                </Link>
              ),
            },
            { key: 'class', label: 'Class', render: (r) => classNameOf(r) || '—' },
            { key: 'required', label: 'Required', className: 'text-right', render: (r) => money(r.required) },
            {
              key: 'paid',
              label: 'Paid',
              className: 'text-right font-semibold',
              render: (r) => <span className={isRedStatus(r.status) ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}>{money(r.paid)}</span>,
            },
            {
              key: 'balance',
              label: 'Balance',
              className: 'text-right',
              render: (r) => <span className={r.balance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}>{money(r.balance)}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <span className="inline-flex items-center gap-1.5">
                  {isRedStatus(r.status) && <i className="bi bi-flag-fill text-red-500" />}
                  <Badge className={statusColor(r.status)}>{r.status.replace('_', ' ')}</Badge>
                </span>
              ),
            },
          ]}
          rows={ranked}
          rowClassName={rowFlag}
          emptyTitle="No students found"
          emptyMessage="Try changing the filters."
          keyFn={(r) => r.student?._id || r.studentId}
        />
      )}

      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Totals: required {money(totals.required)} · paid {money(totals.paid)} · outstanding {money(totals.balance)} (uniform payments excluded).
      </p>
    </div>
  );
}
