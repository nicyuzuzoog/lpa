import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { money, formatDate, feeTypeLabel, paymentMethodLabel, roleLabel } from '../utils/format.js';
import { getSchoolSettings, schoolBranding } from '../utils/export.js';
import { PageHeader, StatCard, Spinner, Badge, EmptyState } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Button, Select } from '../components/Fields.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [years, setYears] = useState([]);
  const [brand, setBrand] = useState(null);
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/academic-years').then((d) => setYears(d.items || [])).catch(() => {});
    getSchoolSettings().then((s) => setBrand(schoolBranding(s))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (year) params.academicYear = year;
      if (term) params.term = term;
      const d = await get('/dashboard', params);
      setData(d);
    } catch (e) {
      setError(e.message || 'Could not load dashboard data.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, term]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Spinner />;
  if (!data) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        message={error || 'Could not load dashboard data.'}
        action={<Button onClick={load}><i className="bi bi-arrow-clockwise" /> Try again</Button>}
      />
    );
  }

  const { finances, collectionRate, role } = data;
  const activeYear = years.find((y) => y._id === year) || years.find((y) => y.isActive) || years[0];
  const terms = activeYear?.terms || [];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {brand?.logo ? (
            <img
              src={brand.logo}
              alt={`${brand.name} logo`}
              className="h-12 w-12 shrink-0 rounded-xl border border-gray-100 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-600 text-lg font-bold text-white">
              <i className="bi bi-mortarboard-fill" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-gray-900">{brand?.name || 'School Management System'}</p>
            <p className="text-xs text-gray-500">
              Welcome back, <span className="font-semibold text-gray-700">{user?.fullName}</span> · {roleLabel(role)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setTerm('');
            }}
          >
            <option value="">Active year</option>
            {years.map((y) => (
              <option key={y._id} value={y._id}>{y.name}</option>
            ))}
          </Select>
          <Select value={term} onChange={(e) => setTerm(e.target.value)}>
            <option value="">All terms</option>
            {terms.map((t) => (
              <option key={t._id || t.name} value={t.name}>{t.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <PageHeader
        title={`Dashboard — ${roleLabel(role)}`}
        subtitle={`${data.academicYear?.name || 'No academic year'} · ${data.term || '—'}`}
      />

      {/* Financial overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Expected" value={money(finances.expected)} icon="bi-bullseye" tone="green" sub={`${data.feeStructureTotal ? `Fee structure: ${money(data.feeStructureTotal)}` : ''}`} />
        <StatCard label="Total Collected" value={money(finances.collected)} icon="bi-cash-coin" tone="green" sub={`${data.termPayments || 0} payments this term`} />
        <StatCard label="Outstanding Balance" value={money(finances.outstanding)} icon="bi-hourglass-split" tone={finances.outstanding > 0 ? 'amber' : 'green'} sub={`${collectionRate}% collected`} />
        <StatCard label="Today's Collection" value={money(data.todayCollection)} icon="bi-calendar-check" sub={`${data.todayPayments} payments today`} />
      </div>

      {/* Student payment status */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Students" value={finances.totalStudents} icon="bi-people" />
        <StatCard label="Fully Paid" value={finances.paid} icon="bi-check-circle-fill" tone="green" />
        <StatCard label="Partially Paid" value={finances.partial} icon="bi-halfmarks" tone="amber" />
        <StatCard label="Unpaid" value={finances.unpaid} icon="bi-x-circle-fill" tone="red" />
      </div>

      {/* Ops */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Inventory Value" value={money(data.inventoryValue)} icon="bi-box-seam" sub={`${data.inventoryItems} items`} />
        <StatCard label="Low Stock Items" value={data.lowStockCount} icon="bi-exclamation-triangle-fill" tone={data.lowStockCount ? 'red' : 'green'} />
        <StatCard label="Uniforms Issued" value={data.uniformIssued} icon="bi-tag" />
        <StatCard label="Unread Notifications" value={data.unreadNotifications} icon="bi-bell-fill" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Recent Payments</h2>
          <Table
            columns={[
              { key: 'receiptNumber', label: 'Receipt', render: (r) => <span className="font-medium text-green-700">{r.receiptNumber}</span> },
              {
                key: 'student',
                label: 'Student',
                render: (r) => (r.student ? `${r.student.firstName} ${r.student.lastName}` : '—'),
              },
              { key: 'feeType', label: 'Fee', render: (r) => feeTypeLabel(r.feeType) },
              { key: 'amount', label: 'Amount', className: 'text-right font-medium', render: (r) => money(r.amount) },
              { key: 'paymentMethod', label: 'Method', render: (r) => paymentMethodLabel(r.paymentMethod) },
              { key: 'paymentDate', label: 'Date', render: (r) => formatDate(r.paymentDate) },
            ]}
            rows={data.recentPayments || []}
            emptyTitle="No payments yet"
            emptyMessage="Recorded payments will appear here."
          />
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Low Stock Alerts</h2>
              <Link to="/app/inventory" className="text-xs font-medium text-green-700 hover:underline">View all</Link>
            </div>
            {(data.lowStockItems || []).length === 0 ? (
              <p className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-500">All items are above minimum levels.</p>
            ) : (
              <ul className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                {data.lowStockItems.slice(0, 6).map((i) => (
                  <li key={i._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-medium text-gray-700">{i.name}</span>
                    <Badge className="bg-red-100 text-red-700">
                      {i.currentStock} / min {i.minimumStockLevel} {i.unit}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
              <Link to="/app/audit" className="text-xs font-medium text-green-700 hover:underline">Audit log</Link>
            </div>
            {(data.recentAudit || []).length === 0 ? (
              <p className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-500">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                {data.recentAudit.map((a) => (
                  <li key={a._id} className="px-4 py-2.5 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">{a.user?.fullName || 'System'}</span> {a.action.toLowerCase()}{' '}
                      <span className="text-gray-500">({a.module})</span>
                    </p>
                    <p className="text-xs text-gray-400">{a.recordLabel} · {formatDate(a.createdAt, true)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
