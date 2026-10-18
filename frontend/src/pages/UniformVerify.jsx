import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { get } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { money, formatDate } from '../utils/format.js';
import { exportPdf, exportExcel } from '../utils/export.js';
import { PageHeader, Spinner, Badge, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Button } from '../components/Fields.jsx';

function StatusBadge({ children, ok }) {
  return ok ? <Badge className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400">{children}</Badge> : <Badge className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">{children}</Badge>;
}

export default function UniformVerify() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get(`/uniforms/verification/${id}`)
      .then(setData)
      .catch((e) => {
        toast.error(e.message);
        navigate('/app/students');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, toast]);

  if (loading) return <Spinner />;
  if (!data || !data.student) return <Spinner />;

  const s = data.student;
  const rows = data.rows || [];
  const t = data.totals || {};
  const paidCount = rows.filter((r) => r.paid).length;
  const paidButNotIssued = rows.filter((r) => r.paid && !r.issued);

  const doPdf = () => {
    exportPdf({
      title: `Uniform Verification — ${s.firstName} ${s.lastName}`,
      subtitle: `${s.studentId} · ${s.class?.name} · ${s.academicYear?.name} · ${s.term}`,
      columns: [
        { key: 'name', label: 'Item' },
        { key: 'size', label: 'Size' },
        { key: 'gender', label: 'Gender' },
        { key: 'price', label: 'Amount', format: (v) => money(v, false) },
        { key: 'paid', label: 'Paid', format: (v) => (v ? 'YES' : 'NO') },
        { key: 'paidAmount', label: 'Paid Amount', format: (v) => money(v, false) },
        { key: 'issued', label: 'Issued', format: (v) => (v ? 'YES' : 'NO') },
        { key: 'stockRemaining', label: 'Stock Remaining' },
      ],
      rows,
      fileName: `uniform-verification-${s.studentId}`,
    });
  };

  return (
    <div>
      <PageHeader
        title={`Uniform Verification — ${s.firstName} ${s.lastName}`}
        subtitle={`${s.studentId} · ${s.class?.name} · ${s.academicYear?.name} · ${s.term}`}
        actions={
          <>
            <Button variant="secondary" onClick={doPdf}>PDF</Button>
            <Link to={`/app/students/${s._id}`} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">← Back to Student</Link>
            {can('payments:create') && (
              <Link to={`/app/payments?student=${s._id}`} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Record Payment</Link>
            )}
          </>
        }
      />

      {paidButNotIssued.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800">
          ⚠️ This student has paid for {paidButNotIssued.length} item{paidButNotIssued.length === 1 ? '' : 's'} that has not been issued yet: {paidButNotIssued.map((r) => r.name).join(', ')}.
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Required" value={t.required} icon="bi-bullseye" />
        <StatCard label="Paid" value={t.paid} icon="bi-cash-coin" tone="green" sub={money(t.paidValue)} />
        <StatCard label="Issued" value={t.issued} icon="bi-tag" />
        <StatCard label="Paid but Not Issued" value={t.notIssued} icon="bi-exclamation-triangle-fill" tone={t.notIssued ? 'amber' : 'green'} />
      </div>

      <Table
        columns={[
          { key: 'name', label: 'Item', render: (r) => <span className="font-medium text-gray-900 dark:text-gray-100">{r.name}</span> },
          { key: 'size', label: 'Size' },
          { key: 'gender', label: 'Gender' },
          { key: 'price', label: 'Amount', className: 'text-right', render: (r) => money(r.price) },
          {
            key: 'paid',
            label: 'Paid',
            render: (r) =>
              r.paid ? <StatusBadge ok>YES{r.paidStatus === 'PARTIAL' ? ' (partial)' : ''}</StatusBadge> : <StatusBadge ok={false}>NO</StatusBadge>,
          },
          { key: 'issued', label: 'Issued', render: (r) => (r.issued ? <StatusBadge ok>YES ×{r.issuedQuantity}</StatusBadge> : <StatusBadge ok={false}>NO</StatusBadge>) },
          { key: 'stockRemaining', label: 'Stock Remaining', className: 'text-right', render: (r) => r.stockRemaining },
        ]}
        rows={rows}
        emptyTitle="No uniform components configured"
        keyFn={(r) => r.uniformItem}
      />

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Issuance History</h2>
        <Table
          columns={[
            {
              key: 'items',
              label: 'Items',
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {(r.items || []).map((i, idx) => (
                    <Badge key={idx} className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400">{i.name} · {i.size} ×{i.quantity} · {money(i.amount)}</Badge>
                  ))}
                </div>
              ),
            },
            { key: 'status', label: 'Status', render: (r) => <Badge className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400">{r.status}</Badge> },
            { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt, true) },
            { key: 'issuedBy', label: 'Issued By', render: (r) => r.issuedBy?.fullName || '—' },
            { key: 'notes', label: 'Notes', render: (r) => r.notes || '—' },
          ]}
          rows={data.issuances || []}
          emptyTitle="No uniforms issued yet"
          emptyMessage="Use the Uniforms page to record physical distribution."
        />
      </div>
    </div>
  );
}