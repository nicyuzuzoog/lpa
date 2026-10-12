import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { money, formatDate, feeTypeLabel, paymentMethodLabel, roleLabel } from '../utils/format.js';
import { getSchoolSettings, schoolBranding } from '../utils/export.js';
import { PageHeader, StatCard, Spinner, Badge, EmptyState } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Button, Select } from '../components/Fields.jsx';

function BrandHeader({ brand, user, role, years, year, term, setYear, setTerm, terms }) {
  return (
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
  );
}

function AttendanceTrend({ trend, total }) {
  if (!trend?.length) {
    return <p className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-500">No attendance recorded in the last 7 days.</p>;
  }
  const max = Math.max(1, ...trend.map((d) => d.present + d.absent + d.late));
  return (
    <ul className="space-y-2">
      {trend.map((d) => {
        const sum = d.present + d.absent + d.late;
        return (
          <li key={d.date} className="flex items-center gap-3 text-xs">
            <span className="w-16 shrink-0 text-gray-500">{formatDate(d.date)}</span>
            <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className="bg-green-500" style={{ width: `${(d.present / max) * 100}%` }} title={`Present: ${d.present}`} />
              <div className="bg-amber-400" style={{ width: `${(d.late / max) * 100}%` }} title={`Late: ${d.late}`} />
              <div className="bg-red-500" style={{ width: `${(d.absent / max) * 100}%` }} title={`Absent: ${d.absent}`} />
            </div>
            <span className="w-24 shrink-0 text-right text-gray-400">{sum}/{total || '—'}</span>
          </li>
        );
      })}
    </ul>
  );
}

function TeacherDashboard({ data }) {
  const t = data.teaching || {};
  const att = t.todayAttendance || {};

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="My Classes" value={t.classes?.length || 0} icon="bi-building" tone="green" sub={t.homeroom ? `Class teacher: ${t.homeroom.name}` : 'No homeroom assigned'} />
        <StatCard label="Homeroom Students" value={t.homeroomStudents || 0} icon="bi-people" />
        <StatCard label="Subjects Taught" value={t.subjects?.length || 0} icon="bi-journal-bookmark" />
        <StatCard label="Unread Notifications" value={data.unreadNotifications || 0} icon="bi-bell-fill" tone={data.unreadNotifications ? 'amber' : 'green'} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Today's Attendance — {t.homeroom?.name || 'No homeroom'}</h2>
              <Link to="/app/attendance" className="text-xs font-medium text-green-700 hover:underline">Mark attendance</Link>
            </div>
            {!t.homeroom ? (
              <p className="text-sm text-gray-500">You are not assigned as a class teacher, so you cannot take attendance.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Present" value={att.present || 0} icon="bi-check-circle-fill" tone="green" />
                <StatCard label="Late" value={att.late || 0} icon="bi-clock-fill" tone="amber" />
                <StatCard label="Absent" value={att.absent || 0} icon="bi-x-circle-fill" tone="red" />
                <StatCard label="Not Marked" value={att.unmarked || 0} icon="bi-dash-circle" />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Attendance — Last 7 Days</h2>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Present</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Late</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Absent</span>
              </div>
            </div>
            <AttendanceTrend trend={t.attendanceTrend} total={t.homeroomStudents} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Recent Assessments</h2>
              <Link to="/app/assessments" className="text-xs font-medium text-green-700 hover:underline">All assessments</Link>
            </div>
            <Table
              columns={[
                { key: 'title', label: 'Title', render: (r) => <Link className="font-medium text-green-700 hover:underline" to={`/app/assessments/${r._id}`}>{r.title}</Link> },
                { key: 'subjectName', label: 'Subject' },
                { key: 'className', label: 'Class' },
                { key: 'maxMarks', label: 'Total', className: 'text-right' },
                { key: 'status', label: 'Status', render: (r) => <Badge className={r.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{r.status}</Badge> },
                { key: 'marksEntered', label: 'Graded', className: 'text-right' },
              ]}
              rows={t.recentAssessments || []}
              emptyTitle="No assessments yet"
              emptyMessage="Create an assessment to start entering marks."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <StatCard label="Assessments" value={t.assessments?.total || 0} icon="bi-clipboard-check" />
              <StatCard label="Open" value={t.assessments?.open || 0} icon="bi-unlock" tone="amber" />
            </div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">My Classes</h2>
            {(t.classes || []).length === 0 ? (
              <p className="text-sm text-gray-500">No classes assigned yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100">
                {t.classes.map((c) => (
                  <li key={c.id} className="px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{c.name}</span>
                      {c.isHomeroom && <Badge className="bg-green-100 text-green-700">Class teacher</Badge>}
                    </div>
                    {c.subjects?.length > 0 && (
                      <p className="mt-0.5 text-xs text-gray-500">{c.subjects.map((s) => s.label).join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function StaffDashboard({ data }) {
  const { finances, collectionRate } = data;
  return (
    <>
      {finances && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Expected" value={money(finances.expected)} icon="bi-bullseye" tone="green" sub={`${data.feeStructureTotal ? `Fee structure: ${money(data.feeStructureTotal)}` : ''}`} />
            <StatCard label="Total Collected" value={money(finances.collected)} icon="bi-cash-coin" tone="green" sub={`${data.termPayments || 0} payments this term`} />
            <StatCard label="Outstanding Balance" value={money(finances.outstanding)} icon="bi-hourglass-split" tone={finances.outstanding > 0 ? 'amber' : 'green'} sub={`${collectionRate}% collected`} />
            <StatCard label="Today's Collection" value={money(data.todayCollection)} icon="bi-calendar-check" sub={`${data.todayPayments} payments today`} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Students" value={finances.totalStudents} icon="bi-people" />
            <StatCard label="Fully Paid" value={finances.paid} icon="bi-check-circle-fill" tone="green" />
            <StatCard label="Partially Paid" value={finances.partial} icon="bi-halfmarks" tone="amber" />
            <StatCard label="Unpaid" value={finances.unpaid} icon="bi-x-circle-fill" tone="red" />
          </div>
        </>
      )}

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

          {data.role === 'SUPER_ADMIN' && (data.recentNotifications || []).length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Latest Notifications</h2>
                <Link to="/app/notifications" className="text-xs font-medium text-green-700 hover:underline">View all</Link>
              </div>
              <ul className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                {data.recentNotifications.slice(0, 5).map((n) => (
                  <li key={n._id} className="px-4 py-2.5 text-sm">
                    <p className="font-medium text-gray-700">{n.title}</p>
                    <p className="text-xs text-gray-400">{formatDate(n.createdAt, true)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

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

  const { role } = data;
  const activeYear = years.find((y) => y._id === year) || years.find((y) => y.isActive) || years[0];
  const terms = activeYear?.terms || [];

  return (
    <div>
      <BrandHeader
        brand={brand}
        user={user}
        role={role}
        years={years}
        year={year}
        term={term}
        setYear={setYear}
        setTerm={setTerm}
        terms={terms}
      />

      <PageHeader
        title={`Dashboard — ${roleLabel(role)}`}
        subtitle={`${data.academicYear?.name || 'No academic year'} · ${data.term || '—'}`}
      />

      {role === 'TEACHER' ? <TeacherDashboard data={data} /> : <StaffDashboard data={data} />}
    </div>
  );
}
