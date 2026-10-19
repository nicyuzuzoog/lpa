import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { get, post, put } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, statusColor, feeTypeLabel } from '../utils/format.js';
import { isPhone, isPlausibleDob } from '../utils/validate.js';
import { PageHeader, Spinner, Badge, Toolbar } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Modal } from '../components/Modal.jsx';
import { Button, Field, Input, Select, Textarea } from '../components/Fields.jsx';

// Per-child fee discounts: set an amount to charge that child something other
// than the standard class fee; blank = the usual class amount.
const FEE_OVERRIDE_TYPES = ['SCHOOL_FEES', 'MATERIALS', 'MEALS', 'UNIFORM', 'OTHER'];
const EMPTY_OVERRIDES = Object.fromEntries(FEE_OVERRIDE_TYPES.map((t) => [t, '']));

const EMPTY = {
  firstName: '', lastName: '', gender: 'MALE', dateOfBirth: '', class: '', academicYear: '',
  term: '', status: 'ACTIVE', eatsAtSchool: false, motherPhone: '', fatherPhone: '', notes: '',
  feeOverrides: { ...EMPTY_OVERRIDES },
};

// True when the child has a discount on at least one fee type.
const hasDiscount = (o) => FEE_OVERRIDE_TYPES.some((t) => o?.[t] !== undefined && o?.[t] !== null && o?.[t] !== '');

export default function Students() {
  const { can } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [structures, setStructures] = useState([]);
  const [filters, setFilters] = useState({ search: '', class: '', status: '', academicYear: '', term: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await get('/students', { ...filters, page, limit: 20 });
      setRows(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, toast]);

  useEffect(() => {
    get('/classes').then((d) => setClasses(d.items || [])).catch(() => {});
    get('/academic-years').then((d) => setYears(d.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Standard class amounts, shown as hints next to the per-child discounts.
  useEffect(() => {
    if (!modalOpen || !form.class || !form.academicYear || !form.term) {
      setStructures([]);
      return undefined;
    }
    let alive = true;
    get('/fees/structures', { class: form.class, academicYear: form.academicYear, term: form.term })
      .then((d) => alive && setStructures(d.items || []))
      .catch(() => alive && setStructures([]));
    return () => { alive = false; };
  }, [modalOpen, form.class, form.academicYear, form.term]);

  const standardByType = structures.reduce((acc, s) => {
    if (s.status === 'ACTIVE') acc[s.feeType] = s.requiredAmount;
    return acc;
  }, {});

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const openCreate = () => {
    const activeYear = years.find((y) => y.isActive) || years[0];
    setEditing(null);
    setForm({
      ...EMPTY,
      feeOverrides: { ...EMPTY_OVERRIDES },
      academicYear: activeYear?._id || '',
      term: activeYear?.terms?.find((t) => t.status === 'ACTIVE')?.name || activeYear?.terms?.[0]?.name || '',
    });
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      class: student.class?._id || student.class,
      academicYear: student.academicYear?._id || student.academicYear,
      term: student.term,
      status: student.status,
      eatsAtSchool: !!student.eatsAtSchool,
      motherPhone: student.motherPhone || '',
      fatherPhone: student.fatherPhone || '',
      notes: student.notes || '',
      feeOverrides: Object.fromEntries(
        FEE_OVERRIDE_TYPES.map((t) => [t, student.feeOverrides?.[t] ?? ''])
      ),
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('First and last name are required');
    if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) return toast.error('Names must be at least 2 characters');
    if (!form.class || !form.academicYear || !form.term) return toast.error('Class, academic year and term are required');
    if (!form.gender) return toast.error('Select a gender');
    if (form.dateOfBirth && !isPlausibleDob(form.dateOfBirth)) return toast.error('Enter a valid date of birth (not in the future)');
    if (!isPhone(form.motherPhone)) return toast.error('Enter a valid mother phone number');
    if (!isPhone(form.fatherPhone)) return toast.error('Enter a valid father phone number');
    const feeOverrides = {};
    for (const t of FEE_OVERRIDE_TYPES) {
      const raw = form.feeOverrides?.[t];
      if (raw === '' || raw === null || raw === undefined) {
        feeOverrides[t] = null;
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return toast.error(`Enter a valid discount amount for ${feeTypeLabel(t)}`);
      feeOverrides[t] = n;
    }
    const payload = { ...form, feeOverrides };
    setSaving(true);
    try {
      if (editing) {
        await put(`/students/${editing._id}`, payload);
        toast.success('Student updated');
      } else {
        const res = await post('/students', payload);
        toast.success(`Student created: ${res.item.studentId}`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const activeYear = years.find((y) => y._id === form.academicYear);

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${total} student${total === 1 ? '' : 's'} found`}
        actions={
          can('students:create') && (
            <Button onClick={openCreate}>+ Add Student</Button>
          )
        }
      />

      <Toolbar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search name or student ID…"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="max-w-xs"
          />
          <Select value={filters.class} onChange={(e) => setFilter('class', e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <Select value={filters.academicYear} onChange={(e) => setFilter('academicYear', e.target.value)}>
            <option value="">All years</option>
            {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </Toolbar>

      {loading ? (
        <Spinner />
      ) : (
        <Table
          columns={[
            {
              key: 'studentId',
              label: 'Student ID',
              render: (r) => (
                <Link to={`/app/students/${r._id}`} className="font-medium text-green-700 dark:text-green-400 hover:underline">
                  {r.studentId}
                </Link>
              ),
            },
            {
              key: 'name',
              label: 'Name',
              render: (r) => (
                <Link to={`/app/students/${r._id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-green-700">
                  {r.firstName} {r.lastName}
                </Link>
              ),
            },
            { key: 'gender', label: 'Gender', render: (r) => <span className="text-gray-500 dark:text-gray-400">{r.gender === 'MALE' ? 'M' : 'F'}</span> },
            { key: 'class', label: 'Class', render: (r) => r.class?.name || '—' },
            {
              key: 'meals',
              label: 'Meals',
              render: (r) =>
                r.eatsAtSchool ? <Badge className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">Eats at school</Badge> : <span className="text-gray-300 dark:text-gray-600">—</span>,
            },
            {
              key: 'discounts',
              label: 'Discounts',
              render: (r) => {
                const ov = r.feeOverrides || {};
                const has = hasDiscount(ov);
                if (!has) return <span className="text-gray-300 dark:text-gray-600">—</span>;
                return (
                  <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">Has discounts</Badge>
                );
              },
            },
            { key: 'academicYear', label: 'Year / Term', render: (r) => <span className="text-gray-500 dark:text-gray-400">{r.academicYear?.name} · {r.term}</span> },
            {
              key: 'phones',
              label: 'Contact (optional)',
              render: (r) => (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {r.motherPhone && <div>M: {r.motherPhone}</div>}
                  {r.fatherPhone && <div>F: {r.fatherPhone}</div>}
                  {!r.motherPhone && !r.fatherPhone && '—'}
                </span>
              ),
            },
            { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (r) =>
                can('students:update') && (
                  <button onClick={() => openEdit(r)} className="text-sm font-medium text-green-700 dark:text-green-400 hover:underline">
                    Edit
                  </button>
                ),
            },
          ]}
          rows={rows}
          emptyTitle="No students found"
          emptyMessage="Try changing the filters or add a new student."
          page={page}
          pages={pages}
          total={total}
          onPage={setPage}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.firstName} ${editing.lastName}` : 'Add Student'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Student'}</Button>
          </>
        }
      >
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name" required>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="e.g. Amina" />
          </Field>
          <Field label="Last Name" required>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="e.g. Uwase" />
          </Field>
          <Field label="Gender" required>
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </Select>
          </Field>
          <Field label="Date of Birth">
            <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </Field>
          <Field label="Class" required>
            <Select value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}>
              <option value="">Select class</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Student Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Academic Year" required>
            <Select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value, term: '' })}>
              <option value="">Select year</option>
              {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
            </Select>
          </Field>
          <Field label="Term" required>
            <Select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
              <option value="">Select term</option>
              {(activeYear?.terms || []).map((t) => <option key={t._id || t.name} value={t.name}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Mother Phone" hint="Optional">
            <Input value={form.motherPhone} onChange={(e) => setForm({ ...form, motherPhone: e.target.value })} placeholder="e.g. 0781234567" />
          </Field>
          <Field label="Father Phone" hint="Optional">
            <Input value={form.fatherPhone} onChange={(e) => setForm({ ...form, fatherPhone: e.target.value })} placeholder="e.g. 0787654321" />
          </Field>
          <Field label="School Feeding" hint="Tick if the student eats at the school — meal payments are tracked on the Meals page.">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <input
                type="checkbox"
                checked={!!form.eatsAtSchool}
                onChange={(e) => setForm({ ...form, eatsAtSchool: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 focus:ring-green-500"
              />
              Eats at school
            </label>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Any additional notes about the student" />
          </Field>
          <div className="sm:col-span-2 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Per-child fee discounts (optional)</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Leave blank to use the standard class amount. Set a positive number to charge this child a specific amount for that fee (e.g. a lower amount for materials).</p>
            {FEE_OVERRIDE_TYPES.map((t) => {
              const std = standardByType[t];
              return (
                <div key={t} className="grid gap-2 sm:grid-cols-[160px,1fr] sm:items-center">
                  <Field label={feeTypeLabel(t)}>
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={form.feeOverrides?.[t] ?? ''}
                      onChange={(e) => setForm({
                        ...form,
                        feeOverrides: { ...(form.feeOverrides || {}), [t]: e.target.value },
                      })}
                      placeholder="e.g. 20000"
                    />
                  </Field>
                  <p className="text-xs text-gray-400 dark:text-gray-500 sm:mt-5">
                    Standard for this class/term: {std != null ? `${Number(std).toLocaleString()} RWF` : 'Not set yet'}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="sm:col-span-2 rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-xs text-green-700 dark:text-green-400">
            Guardian/parent names are not required. Mother and father phone numbers are both optional.
          </p>
        </form>
      </Modal>
    </div>
  );
}
