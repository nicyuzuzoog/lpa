import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get, post, put } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { money, formatDate, statusColor, feeTypeLabel, paymentMethodLabel } from '../utils/format.js';
import { isPositive, isIntInRange, isFutureDate } from '../utils/validate.js';
import { PageHeader, Spinner, Badge, Toolbar } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Modal, ConfirmDialog } from '../components/Modal.jsx';
import { Button, Field, Input, Select, Textarea } from '../components/Fields.jsx';

const EMPTY_FORM = { student: '', feeType: 'SCHOOL_FEES', amount: '', paymentMethod: 'CASH', payerName: '', paymentDate: '', dueDate: '', note: '' };

function StudentPicker({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const d = await get('/students', { search: query, limit: 8 });
        setOptions(d.items || []);
      } catch {
        setOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (s) => {
    setSelected(s);
    onChange(s._id);
    setOpen(false);
  };

  return (
    <div className="relative">
      {!selected ? (
        <>
          <Input
            placeholder="Search student name or ID…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && options.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
              {options.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => pick(s)}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-green-50"
                >
                  <span className="font-medium">{s.firstName} {s.lastName}</span>
                  <span className="ml-2 text-xs text-gray-400">{s.studentId}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-green-50 px-3 py-2">
          <div className="text-sm">
            <span className="font-medium text-gray-900">{selected.firstName} {selected.lastName}</span>
            <span className="ml-2 text-xs text-gray-500">{selected.studentId} · {selected.class?.name} · {selected.academicYear?.name} · {selected.term}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              onChange('');
              setQuery('');
            }}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
}

export default function Payments() {
  const { can } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({
    search: '', feeType: '', paymentMethod: '', status: '', academicYear: '', term: '',
    class: '', dateFrom: '', dateTo: '', student: params.get('student') || '',
  });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [summary, setSummary] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/payments', { ...filters, page, limit: 20 });
      setRows(d.items);
      setTotal(d.total);
      setPages(d.pages);
      setTotalAmount(d.totalAmount);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, toast]);

  useEffect(() => {
    Promise.all([get('/academic-years'), get('/classes')])
      .then(([y, c]) => {
        setYears(y.items || []);
        setClasses(c.items || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get('student')) setFilters((f) => ({ ...f, student: params.get('student') }));
  }, [params]);

  const setFilter = (k, v) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  };

  const activeYear = years.find((y) => y._id === filters.academicYear);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, student: params.get('student') || '', paymentDate: new Date().toISOString().slice(0, 10) });
    setSummary(null);
    setModal('create');
  };

  const onStudentChange = async (id) => {
    setForm((f) => ({ ...f, student: id }));
    setSummary(null);
    if (id) {
      try {
        const d = await get(`/students/${id}`);
        setSummary(d.feeSummary);
      } catch (e) {
        toast.error(e.message);
        setSummary(null);
      }
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.student) return toast.error('Select a student');
    if (!form.feeType) return toast.error('Select a fee type');
    if (!form.paymentMethod) return toast.error('Select a payment method');
    if (!isPositive(form.amount)) return toast.error('Enter a valid payment amount greater than 0');
    if (!isIntInRange(form.amount, 1)) return toast.error('Payment amount must be a whole number');
    if (isFutureDate(form.paymentDate)) return toast.error('Payment date cannot be in the future');
    if (['BANK', 'MOBILE_MONEY'].includes(form.paymentMethod) && !form.payerName.trim())
      return toast.error('Enter the name of the person who paid (required for bank and mobile money)');
    if (remainingAfter > 0 && !form.dueDate)
      return toast.error('Enter the date the student will come back to pay the remaining balance');
    if (form.dueDate && form.paymentDate && form.dueDate < form.paymentDate)
      return toast.error('The come-back-to-pay date cannot be before the payment date');
    setSaving(true);
    try {
      const d = await post('/payments', { ...form, amount: Number(form.amount) });
      toast.success(`Payment recorded · ${d.item.receiptNumber}`);
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const doEdit = async (e) => {
    e.preventDefault();
    if (!form.reason || !form.reason.trim()) return toast.error('A reason is required to correct a payment');
    if (!isPositive(form.amount)) return toast.error('Enter a valid payment amount greater than 0');
    if (!isIntInRange(form.amount, 1)) return toast.error('Payment amount must be a whole number');
    if (isFutureDate(form.paymentDate)) return toast.error('Payment date cannot be in the future');
    if (['BANK', 'MOBILE_MONEY'].includes(form.paymentMethod) && !form.payerName.trim())
      return toast.error('Enter the name of the person who paid (required for bank and mobile money)');
    if (form.dueDate && form.paymentDate && form.dueDate < form.paymentDate)
      return toast.error('The come-back-to-pay date cannot be before the payment date');
    setSaving(true);
    try {
      const d = await put(`/payments/${modal._id}`, { reason: form.reason, amount: Number(form.amount), paymentMethod: form.paymentMethod, payerName: form.payerName, paymentDate: form.paymentDate, dueDate: form.dueDate, note: form.note });
      toast.success(`Payment corrected · ${d.item.receiptNumber}`);
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p) => {
    setForm({
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      payerName: p.payerName || '',
      paymentDate: p.paymentDate.slice(0, 10),
      dueDate: p.dueDate ? p.dueDate.slice(0, 10) : '',
      note: p.note || '',
      reason: '',
    });
    setModal(p);
  };

  const doReverseOrVoid = async (reason) => {
    setSaving(true);
    try {
      const endpoint = confirm.type === 'VOID' ? 'void' : 'reverse';
      await post(`/payments/${confirm.id}/${endpoint}`, { reason });
      toast.success(`Payment ${confirm.type.toLowerCase()}ed`);
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const summaryRow = summary?.rows?.find((r) => r.feeType === form.feeType);
  const remainingAfter = summaryRow ? summaryRow.balance - Number(form.amount || 0) : 0;

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle={`${total} payments · ${money(totalAmount)} recorded`}
        actions={can('payments:create') && <Button onClick={openCreate}>+ Record Payment</Button>}
      />

      <Toolbar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input placeholder="Search receipt…" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="max-w-[140px]" />
          <Select value={filters.feeType} onChange={(e) => setFilter('feeType', e.target.value)}>
            <option value="">All fee types</option>
            {['SCHOOL_FEES', 'MATERIALS', 'UNIFORM', 'OTHER'].map((t) => <option key={t} value={t}>{feeTypeLabel(t)}</option>)}
          </Select>
          <Select value={filters.paymentMethod} onChange={(e) => setFilter('paymentMethod', e.target.value)}>
            <option value="">All methods</option>
            {['CASH', 'BANK', 'MOBILE_MONEY', 'OTHER'].map((m) => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="REVERSED">Reversed</option>
            <option value="VOID">Void</option>
          </Select>
          <Select value={filters.academicYear} onChange={(e) => setFilter('academicYear', e.target.value)}>
            <option value="">All years</option>
            {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
          </Select>
          <Select value={filters.term} onChange={(e) => setFilter('term', e.target.value)}>
            <option value="">All terms</option>
            {(activeYear?.terms || []).map((t) => <option key={t._id || t.name} value={t.name}>{t.name}</option>)}
          </Select>
          <Select value={filters.class} onChange={(e) => setFilter('class', e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <Input type="date" placeholder="From date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} className="max-w-[150px]" />
          <Input type="date" placeholder="To date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} className="max-w-[150px]" />
          {(filters.feeType || filters.paymentMethod || filters.status || filters.academicYear || filters.term || filters.class || filters.dateFrom || filters.dateTo || filters.search || filters.student) && (
            <button
              onClick={() => {
                setPage(1);
                setFilters({ ...EMPTY_FORM, search: '', feeType: '', paymentMethod: '', status: '', academicYear: '', term: '', class: '', dateFrom: '', dateTo: '', student: params.get('student') || '' });
              }}
              className="text-sm font-medium text-red-600 hover:underline"
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
              key: 'receiptNumber',
              label: 'Receipt',
              render: (r) => (
                <Link to={`/app/payments/${r._id}/receipt`} className="font-medium text-green-700 hover:underline">
                  {r.receiptNumber}
                </Link>
              ),
            },
            {
              key: 'student',
              label: 'Student',
              render: (r) =>
                r.student ? (
                  <Link to={`/app/students/${r.student._id}`} className="font-medium text-gray-900 hover:text-green-700">
                    {r.student.firstName} {r.student.lastName}
                    <span className="ml-1 text-xs text-gray-400">({r.student.studentId})</span>
                  </Link>
                ) : (
                  '—'
                ),
            },
            { key: 'class', label: 'Class', render: (r) => r.student?.class?.name || '—' },
            { key: 'feeType', label: 'Fee Type', render: (r) => feeTypeLabel(r.feeType) },
            { key: 'amount', label: 'Amount', className: 'text-right font-semibold', render: (r) => money(r.amount) },
            {
              key: 'paymentMethod',
              label: 'Method',
              render: (r) => (
                <span>
                  {paymentMethodLabel(r.paymentMethod)}
                  {r.payerName ? <span className="block text-xs text-gray-400">by {r.payerName}</span> : null}
                </span>
              ),
            },
            {
              key: 'paymentDate',
              label: 'Date',
              render: (r) => (
                <span>
                  {formatDate(r.paymentDate)}
                  {r.dueDate ? <span className="block text-xs text-amber-600">due {formatDate(r.dueDate)}</span> : null}
                </span>
              ),
            },
            { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
            {
              key: 'recordedBy',
              label: 'By',
              render: (r) => <span className="text-gray-500">{r.recordedBy?.fullName || '—'}</span>,
            },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (r) => (
                <span className="flex justify-end gap-3 text-sm whitespace-nowrap">
                  <Link to={`/app/payments/${r._id}/receipt`} className="font-medium text-green-700 hover:underline">Receipt</Link>
                  {can('payments:update') && r.status === 'ACTIVE' && (
                    <button onClick={() => openEdit(r)} className="font-medium text-green-700 hover:underline">Edit</button>
                  )}
                  {can('payments:reverse') && r.status === 'ACTIVE' && (
                    <>
                      <button onClick={() => setConfirm({ id: r._id, type: 'REVERSAL', label: r.receiptNumber, amount: r.amount })} className="font-medium text-amber-600 hover:underline">Reverse</button>
                      <button onClick={() => setConfirm({ id: r._id, type: 'VOID', label: r.receiptNumber, amount: r.amount })} className="font-medium text-red-600 hover:underline">Void</button>
                    </>
                  )}
                </span>
              ),
            },
          ]}
          rows={rows}
          emptyTitle="No payments found"
          page={page}
          pages={pages}
          total={total}
          onPage={setPage}
        />
      )}

      {/* Record payment */}
      <Modal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        title="Record Payment"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Recording…' : 'Record Payment'}</Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Student" required>
            <StudentPicker value={form.student} onChange={onStudentChange} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fee Type" required>
              <Select value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })}>
                {['SCHOOL_FEES', 'MATERIALS', 'UNIFORM', 'OTHER'].map((t) => <option key={t} value={t}>{feeTypeLabel(t)}</option>)}
              </Select>
            </Field>
            <Field label="Amount (RWF)" required>
              <Input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 40000" />
            </Field>
            <Field label="Payment Method" required>
              <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                {['CASH', 'BANK', 'MOBILE_MONEY', 'OTHER'].map((m) => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
              </Select>
            </Field>
            <Field label="Payment Date">
              <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
            </Field>
            {['BANK', 'MOBILE_MONEY'].includes(form.paymentMethod) && (
              <Field label="Paid by (depositor name)" required hint="The name of the person who paid at the bank or via mobile money.">
                <Input value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} placeholder="e.g. Jean Bosco" />
              </Field>
            )}
            {remainingAfter > 0 && (
              <Field label="Come back to pay by" required hint={`Remaining balance: ${money(remainingAfter)}`}>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </Field>
            )}
          </div>

          {summary && summaryRow && (
            <div className="rounded-lg bg-green-50 p-3 text-sm">
              <p className="mb-1 font-medium text-green-800">
                {feeTypeLabel(form.feeType)} balance for this student:
                {summaryRow.optional && <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600">optional</span>}
              </p>
              <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
                <div><p className="text-xs text-green-600">Required</p><p className="break-words font-semibold text-gray-900">{money(summaryRow.required)}</p></div>
                <div><p className="text-xs text-green-600">Paid</p><p className="break-words font-semibold text-gray-900">{money(summaryRow.paid)}</p></div>
                <div><p className="text-xs text-green-600">Balance</p><p className="break-words font-semibold text-gray-900">{money(summaryRow.balance)}</p></div>
              </div>
              {isPositive(form.amount) && (
                <p className="mt-2 text-center text-xs font-medium text-green-800">
                  Remaining after this payment: {money(Math.max(0, remainingAfter))}
                </p>
              )}
            </div>
          )}

          <Field label="Note">
            <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </form>
      </Modal>

      {/* Edit / correction */}
      <Modal
        open={modal && modal._id}
        onClose={() => setModal(null)}
        title={`Correct Payment ${modal?.receiptNumber || ''}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={doEdit} disabled={saving || !form.reason?.trim()}>{saving ? 'Saving…' : 'Save Correction'}</Button>
          </>
        }
      >
        <form onSubmit={doEdit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (RWF)" required>
              <Input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="Payment Method">
              <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                {['CASH', 'BANK', 'MOBILE_MONEY', 'OTHER'].map((m) => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
              </Select>
            </Field>
            {['BANK', 'MOBILE_MONEY'].includes(form.paymentMethod) && (
              <Field label="Paid by (depositor name)" required>
                <Input value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} placeholder="e.g. Jean Bosco" />
              </Field>
            )}
          </div>
          <Field label="Payment Date">
            <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
          </Field>
          <Field label="Come back to pay by" hint="Required if the student still has a balance after this payment.">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Note">
            <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Field label="Reason for correction" required hint="Required. The original value stays in the audit trail.">
            <Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Incorrect amount entered" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doReverseOrVoid}
        loading={saving}
        title={confirm?.type === 'VOID' ? 'Void this payment?' : 'Reverse this payment?'}
        message={`${confirm?.label || ''} (${money(confirm?.amount || 0)}) — the original record remains in the audit trail and is never permanently deleted.`}
        reasonLabel="Reason (required)"
        reasonRequired
        confirmLabel={confirm?.type === 'VOID' ? 'Void Payment' : 'Reverse Payment'}
        confirmClass={confirm?.type === 'VOID' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}
      />
    </div>
  );
}