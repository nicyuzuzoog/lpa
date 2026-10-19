import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { get } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { money, formatDate, statusColor, feeTypeLabel, paymentMethodLabel } from '../utils/format.js';
import { PageHeader, Spinner, Badge, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get(`/students/${id}`)
      .then(setData)
      .catch((e) => {
        toast.error(e.message);
        navigate('/app/students');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  if (loading || !data) return <Spinner />;

  const s = data.item;
  const summary = data.feeSummary;
  const payments = data.payments || [];

  return (
    <div>
      <PageHeader
        title={`${s.firstName} ${s.lastName}`}
        subtitle={`${s.studentId} · ${s.class?.name} · ${s.academicYear?.name} · ${s.term}`}
        actions={
          <>
            <Link to="/app/students" className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              ← Back
            </Link>
            {can('uniforms:read') && (
              <Link to={`/app/uniforms/verify/${s._id}`} className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/40 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-100">
                Uniform Verification
              </Link>
            )}
            {can('payments:create') && (
              <Link to={`/app/payments?student=${s._id}`} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Record Payment
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Student Information</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Status</dt><dd><Badge className={statusColor(s.status)}>{s.status}</Badge></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Gender</dt><dd className="font-medium">{s.gender}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Date of Birth</dt><dd className="font-medium">{formatDate(s.dateOfBirth)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Mother Phone</dt><dd className="font-medium">{s.motherPhone || <span className="text-gray-400 dark:text-gray-500">Not provided</span>}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Father Phone</dt><dd className="font-medium">{s.fatherPhone || <span className="text-gray-400 dark:text-gray-500">Not provided</span>}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Enrolled</dt><dd className="font-medium">{formatDate(s.createdAt)}</dd></div>
          </dl>
          {s.notes && <p className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 p-3 text-xs text-gray-600 dark:text-gray-300">{s.notes}</p>}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Required" value={money(summary.totalRequired)} tone="green" />
            <StatCard label="Paid" value={money(summary.totalPaid)} tone="green" />
            <StatCard label="Balance" value={money(summary.totalBalance)} tone={summary.totalBalance > 0 ? 'red' : 'green'} sub={summary.overallStatus} />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Fee Breakdown</h2>
            <Table
              columns={[
                { key: 'feeType', label: 'Fee Type', render: (r) => (
                  <span className="font-medium">
                    {feeTypeLabel(r.feeType)}
                    {r.optional && <span className="ml-2 rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">optional</span>}
                  </span>
                ) },
                { key: 'required', label: 'Required', className: 'text-right', render: (r) => (
                  <div>
                    <div className={r.discounted ? 'font-medium text-amber-700 dark:text-amber-400' : ''}>{money(r.required)}</div>
                    {r.discounted && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        <span className="line-through">{money(r.standardAmount)}</span>
                        {' '}
                        <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-1 py-0.5 font-medium text-amber-700 dark:text-amber-400">discount</span>
                      </div>
                    )}
                  </div>
                ) },
                { key: 'paid', label: 'Paid', className: 'text-right', render: (r) => money(r.paid) },
                { key: 'balance', label: 'Balance', className: 'text-right font-medium', render: (r) => money(r.balance) },
                { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status.replace('_', ' ')}</Badge> },
              ]}
              rows={summary.rows}
              dense
              emptyTitle="No fee structure"
              emptyMessage="Ask the Super Admin to configure fees for this class and term."
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Payment History ({payments.length})</h2>
        </div>
        <Table
          columns={[
            {
              key: 'receiptNumber',
              label: 'Receipt',
              render: (r) => (
                <Link to={`/app/payments/${r._id}/receipt`} className="font-medium text-green-700 dark:text-green-400 hover:underline">
                  {r.receiptNumber}
                </Link>
              ),
            },
            { key: 'feeType', label: 'Fee Type', render: (r) => feeTypeLabel(r.feeType) },
            { key: 'amount', label: 'Amount', className: 'text-right font-medium', render: (r) => money(r.amount) },
            { key: 'paymentMethod', label: 'Method', render: (r) => paymentMethodLabel(r.paymentMethod) },
            { key: 'balanceAfter', label: 'Balance After', className: 'text-right', render: (r) => money(r.balanceAfter) },
            { key: 'paymentDate', label: 'Date', render: (r) => formatDate(r.paymentDate, true) },
            { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
            {
              key: 'recordedBy',
              label: 'Recorded By',
              render: (r) => <span className="text-gray-500 dark:text-gray-400">{r.recordedBy?.fullName || '—'}</span>,
            },
          ]}
          rows={payments}
          emptyTitle="No payments yet"
          emptyMessage="Payments recorded for this student will appear here."
        />
      </div>
    </div>
  );
}
