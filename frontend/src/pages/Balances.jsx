import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { money, statusColor } from '../utils/format.js';
import { exportPdf, exportExcel, moneyFormat } from '../utils/export.js';
import { PageHeader, Spinner, Badge, Toolbar, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Button, Input, Select } from '../components/Fields.jsx';

const EMPTY_FILTERS = { search: '', class: '', academicYear: '', term: '', status: '' };

const studentName = (r) => r.name || `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || '—';
const studentIdOf = (r) => r.studentId || r.student?.studentId || '';
const classNameOf = (r) => r.class || r.student?.class?.name || '';

export default function Balances() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ required: 0, paid: 0, balance: 0 });
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

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
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    load();
  }, [load]);

  const activeYear = years.find((y) => y._id === filters.academicYear);
  const collectionRate = totals.required > 0 ? Math.round((totals.paid / totals.required) * 100) : 0;
  const yearName = activeYear?.name;

  const hasFilters = Object.values(filters).some((v) => v !== '');

  const clearFilters = () => {
    setSearchInput('');
    setFilters((f) => ({ ...EMPTY_FILTERS, academicYear: f.academicYear, term: f.term }));
  };

  const doPdf = () => {
    exportPdf({
      title: 'Student Outstanding Balances',
      subtitle: `${yearName || 'All years'} · ${filters.term || 'All terms'}${filters.class ? ` · Class: ${classes.find((c) => c._id === filters.class)?.name}` : ''}`,
      columns: [
        { key: 'studentId', label: 'Student ID', format: (v, r) => studentIdOf(r) },
        { key: 'name', label: 'Student Name', format: (v, r) => studentName(r) },
        { key: 'class', label: 'Class', format: (v, r) => classNameOf(r) },
        { key: 'required', label: 'Required', format: moneyFormat },
        { key: 'paid', label: 'Paid', format: moneyFormat },
        { key: 'balance', label: 'Balance', format: moneyFormat },
        { key: 'status', label: 'Status' },
      ],
      rows,
      fileName: 'student-balances',
    }).catch((e) => toast.error(e.message));
  };

  const doExcel = () => {
    exportExcel({
      title: 'Student Outstanding Balances',
      columns: [
        { key: 'studentId', label: 'Student ID', format: (v, r) => studentIdOf(r) },
        { key: 'name', label: 'Student Name', format: (v, r) => studentName(r) },
        { key: 'class', label: 'Class', format: (v, r) => classNameOf(r) },
        { key: 'required', label: 'Required (RWF)', format: moneyFormat },
        { key: 'paid', label: 'Paid (RWF)', format: moneyFormat },
        { key: 'balance', label: 'Balance (RWF)', format: moneyFormat },
        { key: 'status', label: 'Status' },
      ],
      rows,
      fileName: 'student-balances',
      sheetName: 'Balances',
    }).catch((e) => toast.error(e.message));
  };

  return (
    <div>
      <PageHeader
        title="Student Balances"
        subtitle="Outstanding balances from required fees minus active payments. Uniform is optional and is not counted here."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Required" value={money(totals.required)} icon="bi-bullseye" tone="green" />
        <StatCard label="Total Paid" value={money(totals.paid)} icon="bi-cash-coin" tone="green" sub={`${collectionRate}% collected`} />
        <StatCard label="Outstanding" value={money(totals.balance)} icon="bi-hourglass-split" tone={totals.balance > 0 ? 'amber' : 'green'} />
        <StatCard label="Students" value={rows.length} icon="bi-people" />
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
            <button onClick={clearFilters} className="text-sm font-medium text-red-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={doPdf}><i className="bi bi-file-earmark-pdf" /> PDF</Button>
          <Button variant="secondary" onClick={doExcel}><i className="bi bi-file-earmark-excel" /> Excel</Button>
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
                <Link to={`/app/students/${r.student._id}`} className="font-medium text-gray-900 hover:text-green-700">
                  {studentName(r)}
                  <span className="ml-1 text-xs text-gray-400">({studentIdOf(r)})</span>
                </Link>
              ),
            },
            { key: 'class', label: 'Class', render: (r) => classNameOf(r) || '—' },
            { key: 'required', label: 'Required', className: 'text-right', render: (r) => money(r.required) },
            { key: 'paid', label: 'Paid', className: 'text-right', render: (r) => money(r.paid) },
            { key: 'balance', label: 'Balance', className: 'text-right font-semibold', render: (r) => <span className={r.balance > 0 ? 'text-amber-700' : 'text-green-700'}>{money(r.balance)}</span> },
            { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status.replace('_', ' ')}</Badge> },
          ]}
          rows={rows}
          emptyTitle="No students found"
          emptyMessage="Try changing the filters."
          keyFn={(r) => r.student?._id || r.studentId}
        />
      )}
    </div>
  );
}
