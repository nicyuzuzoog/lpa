import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { money, statusColor, isRedStatus } from '../utils/format.js';
import { exportPdf, exportExcel, moneyFormat } from '../utils/export.js';
import { PageHeader, Spinner, Badge, Toolbar, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Button, Input, Select } from '../components/Fields.jsx';

const EMPTY_FILTERS = { search: '', class: '', academicYear: '', term: '', status: '' };

const mealStatusColor = (s) => {
  if (s === 'NOT_CONFIGURED') return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
  return statusColor(s);
};

const studentName = (r) => r.name || `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || '—';
const studentIdOf = (r) => r.studentId || r.student?.studentId || '';
const classNameOf = (r) => r.class || r.student?.class?.name || '';

export default function Meals() {
  const { can } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ required: 0, paid: 0, balance: 0 });
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/students/meals', filters);
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

  const activeYear = years.find((y) => y._id === filters.academicYear);
  const redRows = rows.filter((r) => isRedStatus(r.status));
  const configured = rows.filter((r) => r.status !== 'NOT_CONFIGURED');
  const fullyPaid = rows.filter((r) => r.status === 'PAID' || r.status === 'OVERPAID').length;
  const collectionRate = totals.required > 0 ? Math.round((totals.paid / totals.required) * 100) : null;
  const hasFilters = Object.values(filters).some((v) => v !== '');

  const exportColumns = [
    { key: 'studentId', label: 'Student ID', format: (v, r) => studentIdOf(r) },
    { key: 'name', label: 'Student', format: (v, r) => studentName(r) },
    { key: 'class', label: 'Class', format: (v, r) => classNameOf(r) },
    { key: 'required', label: 'Meal Fee (RWF)', format: moneyFormat },
    { key: 'paid', label: 'Paid (RWF)', format: moneyFormat },
    { key: 'balance', label: 'Balance (RWF)', format: moneyFormat },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div>
      <PageHeader
        title="School Feeding — Meal Payments"
        subtitle="Students who eat at the school each owe the meal charge (40,000 RWF/term). Payments are allocated to meals first — any remainder goes to supplies and tuition."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                exportPdf({
                  title: 'School Feeding — Meal Payments',
                  subtitle: `${activeYear?.name || 'All years'} · ${filters.term || 'All terms'}`,
                  columns: exportColumns,
                  rows,
                  fileName: 'meal-payments',
                }).catch((e) => toast.error(e.message))
              }
            >
              <i className="bi bi-file-earmark-pdf" /> PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                exportExcel({
                  title: 'School Feeding — Meal Payments',
                  columns: exportColumns,
                  rows,
                  fileName: 'meal-payments',
                  sheetName: 'Meals',
                }).catch((e) => toast.error(e.message))
              }
            >
              <i className="bi bi-file-earmark-excel" /> Excel
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Eating at School" value={rows.length} icon="bi-cup-hot" tone="green" />
        <StatCard label="Meals Collected" value={money(totals.paid)} icon="bi-cash-coin" tone="green" sub={collectionRate === null ? 'pay-as-you-eat (no fixed meal fee)' : `${collectionRate}% of expected`} />
        <StatCard label="Meal Fees Outstanding" value={money(totals.balance)} icon="bi-hourglass-split" tone={totals.balance > 0 ? 'red' : 'green'} />
        <StatCard label="Fully Paid" value={`${fullyPaid}/${configured.length || rows.length}`} icon="bi-check2-circle" tone="green" />
      </div>

      {redRows.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
          <i className="bi bi-exclamation-octagon-fill" />
          <span>
            <strong>{redRows.length}</strong> student{redRows.length === 1 ? '' : 's'} with meal fees unpaid — highlighted below.
          </span>
        </div>
      )}

      <Toolbar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search name or ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-[200px]"
          />
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
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </Select>
          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput('');
                setFilters((f) => ({ ...EMPTY_FILTERS, academicYear: f.academicYear, term: f.term }));
              }}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </Toolbar>

      {loading ? (
        <Spinner />
      ) : (
        <Table
          columns={[
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
            {
              key: 'required',
              label: 'Meal Fee',
              className: 'text-right',
              render: (r) => (r.status === 'NOT_CONFIGURED' ? <span className="text-xs text-gray-400 dark:text-gray-500">not configured</span> : money(r.required)),
            },
            { key: 'paid', label: 'Paid', className: 'text-right font-semibold', render: (r) => money(r.paid) },
            {
              key: 'balance',
              label: 'Balance',
              className: 'text-right',
              render: (r) => <span className={r.balance > 0 ? 'font-semibold text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}>{money(r.balance)}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <span className="inline-flex items-center gap-1.5">
                  {isRedStatus(r.status) && <i className="bi bi-flag-fill text-red-500" />}
                  <Badge className={mealStatusColor(r.status)}>{r.status === 'NOT_CONFIGURED' ? 'NO FEE SET' : r.status.replace('_', ' ')}</Badge>
                </span>
              ),
            },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (r) =>
                can('payments:create') && (
                  <Link to={`/app/payments?student=${r.student._id}`} className="whitespace-nowrap text-sm font-medium text-green-700 dark:text-green-400 hover:underline">
                    Record Payment
                  </Link>
                ),
            },
          ]}
          rows={rows}
          rowClassName={(r) => (isRedStatus(r.status) ? 'bg-red-50/80 ring-1 ring-inset ring-red-100 dark:bg-red-950/30 dark:ring-red-900' : '')}
          emptyTitle="No students eating at the school"
          emptyMessage="Mark students as “Eats at school” from the Students page to track their meal payments."
          keyFn={(r) => r.student?._id || r.studentId}
        />
      )}
    </div>
  );
}
