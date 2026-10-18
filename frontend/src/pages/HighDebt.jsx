import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { money, statusColor } from '../utils/format.js';
import { exportPdf, exportExcel, moneyFormat } from '../utils/export.js';
import { PageHeader, Spinner, Badge, Toolbar, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Button, Input, Select } from '../components/Fields.jsx';

const EMPTY_FILTERS = { search: '', class: '', academicYear: '', term: '' };
const THRESHOLD = 0.6; // more than 60% of the required amount still unpaid

const studentName = (r) => r.name || `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || '—';
const studentIdOf = (r) => r.studentId || r.student?.studentId || '';
const classNameOf = (r) => r.class || r.student?.class?.name || '';

export default function HighDebt() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/payments/balances', filters);
      setRows(d.items);
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

  const flagged = rows
    .filter((r) => r.required > 0 && r.balance / r.required > THRESHOLD)
    .map((r) => ({ ...r, pctUnpaid: Math.round((r.balance / r.required) * 100) }))
    .sort((a, b) => b.pctUnpaid - a.pctUnpaid || b.balance - a.balance);

  const totalOwed = flagged.reduce((a, r) => a + r.balance, 0);
  const avgPct = flagged.length ? Math.round(flagged.reduce((a, r) => a + r.pctUnpaid, 0) / flagged.length) : 0;
  const activeYear = years.find((y) => y._id === filters.academicYear);
  const hasFilters = Object.values(filters).some((v) => v !== '');

  const exportColumns = [
    { key: 'studentId', label: 'Student ID', format: (v, r) => studentIdOf(r) },
    { key: 'name', label: 'Student Name', format: (v, r) => studentName(r) },
    { key: 'class', label: 'Class', format: (v, r) => classNameOf(r) },
    { key: 'required', label: 'Required (RWF)', format: moneyFormat },
    { key: 'paid', label: 'Paid (RWF)', format: moneyFormat },
    { key: 'balance', label: 'Balance (RWF)', format: moneyFormat },
    { key: 'pctUnpaid', label: '% Unpaid' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div>
      <PageHeader
        title="Significant Debt"
        subtitle="Students with more than 60% of their required fees still unpaid. Uniform is optional and excluded from these totals."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                exportPdf({
                  title: 'Significant Debt (>60% unpaid)',
                  subtitle: `${activeYear?.name || 'All years'} · ${filters.term || 'All terms'}`,
                  columns: exportColumns,
                  rows: flagged,
                  fileName: 'significant-debt',
                }).catch((e) => toast.error(e.message))
              }
            >
              <i className="bi bi-file-earmark-pdf" /> PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                exportExcel({
                  title: 'Significant Debt (>60% unpaid)',
                  columns: exportColumns,
                  rows: flagged,
                  fileName: 'significant-debt',
                  sheetName: 'Significant Debt',
                }).catch((e) => toast.error(e.message))
              }
            >
              <i className="bi bi-file-earmark-excel" /> Excel
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Students Flagged" value={flagged.length} icon="bi-exclamation-octagon-fill" tone={flagged.length ? 'red' : 'green'} />
        <StatCard label="Total Still Owed" value={money(totalOwed)} icon="bi-cash-stack" tone={totalOwed > 0 ? 'red' : 'green'} />
        <StatCard label="Average Unpaid" value={`${avgPct}%`} icon="bi-graph-down-arrow" tone="red" />
        <StatCard label="Threshold" value="> 60%" icon="bi-bullseye" />
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
        <i className="bi bi-flag-fill" />
        <span>Every student below has <strong>more than 60% unpaid</strong> — they are highlighted in red for follow-up with guardians.</span>
      </div>

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
            { key: 'required', label: 'Required', className: 'text-right', render: (r) => money(r.required) },
            { key: 'paid', label: 'Paid', className: 'text-right', render: (r) => money(r.paid) },
            {
              key: 'balance',
              label: 'Balance Owed',
              className: 'text-right font-semibold',
              render: (r) => <span className="text-red-700 dark:text-red-400">{money(r.balance)}</span>,
            },
            {
              key: 'pctUnpaid',
              label: '% Unpaid',
              className: 'text-right',
              render: (r) => (
                <span className="inline-flex items-center gap-2">
                  <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-red-100 dark:bg-red-950/60 sm:block">
                    <span className="block h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, r.pctUnpaid)}%` }} />
                  </span>
                  <span className="font-bold text-red-700 dark:text-red-400">{r.pctUnpaid}%</span>
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <span className="inline-flex items-center gap-1.5">
                  <i className="bi bi-flag-fill text-red-500" />
                  <Badge className={statusColor(r.status)}>{r.status.replace('_', ' ')}</Badge>
                </span>
              ),
            },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (r) => (
                <Link to={`/app/payments?student=${r.student._id}`} className="whitespace-nowrap text-sm font-medium text-green-700 dark:text-green-400 hover:underline">
                  Record Payment
                </Link>
              ),
            },
          ]}
          rows={flagged}
          rowClassName={() => 'bg-red-50/80 ring-1 ring-inset ring-red-100 dark:bg-red-950/30 dark:ring-red-900'}
          emptyTitle="No students above the 60% threshold"
          emptyMessage="Nobody currently owes more than 60% of their required fees."
          keyFn={(r) => r.student?._id || r.studentId}
        />
      )}
    </div>
  );
}
