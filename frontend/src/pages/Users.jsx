import { useEffect, useState, useCallback } from 'react';
import { get, post, put } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime, roleLabel, statusColor } from '../utils/format.js';
import { SUBJECTS, subjectLabel } from '../utils/subjects.js';
import { isEmail, isValidUsername, isStrongPassword } from '../utils/validate.js';
import { PageHeader, Spinner, Badge, Toolbar } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Modal } from '../components/Modal.jsx';
import { Button, Field, Input, Select, PasswordInput } from '../components/Fields.jsx';

const EMPTY = { fullName: '', username: '', email: '', password: '', role: 'ACCOUNTANT', status: 'ACTIVE', classTeacherOf: '', teachingAssignments: [] };

export default function Users() {
  const { user: me, can } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get('/classes')
      .then((d) => setClasses(d.items || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/users', { ...filters, page, limit: 20 });
      setRows(d.items || []);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      fullName: u.fullName,
      username: u.username,
      email: u.email || '',
      password: '',
      role: u.role,
      status: u.status,
      classTeacherOf: u.classTeacherOf || '',
      teachingAssignments: (u.teachingAssignments || []).map((a) => ({ class: String(a.class), subject: a.subject })),
    });
    setModal(true);
  };

  const addAssignment = () => {
    const firstClass = classes[0];
    setForm((f) => ({
      ...f,
      teachingAssignments: [...f.teachingAssignments, { class: f.classTeacherOf || firstClass?._id || '', subject: 'KIN' }],
    }));
  };

  const updateAssignment = (i, patch) => {
    setForm((f) => ({
      ...f,
      teachingAssignments: f.teachingAssignments.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    }));
  };

  const removeAssignment = (i) => {
    setForm((f) => ({ ...f, teachingAssignments: f.teachingAssignments.filter((_, idx) => idx !== i) }));
  };

  const teacherPayload = () => {
    if (form.role !== 'TEACHER') return {};
    if (!form.classTeacherOf) {
      toast.error('Select the class this teacher is the class reader of');
      return null;
    }
    const seen = new Set();
    const assignments = [];
    for (const a of form.teachingAssignments) {
      if (!a.class || !a.subject) {
        toast.error('Every subject assignment needs a class and a subject');
        return null;
      }
      const key = `${a.class}:${a.subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      assignments.push({ class: a.class, subject: a.subject });
    }
    return { classTeacherOf: form.classTeacherOf, teachingAssignments: assignments };
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.username.trim()) return toast.error('Full name and username are required');
    if (form.fullName.trim().length < 3) return toast.error('Full name must be at least 3 characters');
    if (!isValidUsername(form.username)) return toast.error('Username must be 3–30 characters: letters, numbers, dot, dash or underscore');
    if (!editing && !form.password) return toast.error('Password is required');
    if (form.password && !isStrongPassword(form.password)) return toast.error('Password must be at least 8 characters and include a letter and a number');
    if (!isEmail(form.email)) return toast.error('Enter a valid email address');
    if (!form.role) return toast.error('Select a role');

    const teaching = teacherPayload();
    if (teaching === null) return;

    setSaving(true);
    try {
      if (editing) {
        const payload = { fullName: form.fullName, email: form.email, role: form.role, status: form.status, ...teaching };
        if (form.password) payload.password = form.password;
        await put(`/users/${editing.id}`, payload);
        toast.success('User updated');
      } else {
        await post('/users', { ...form, ...teaching });
        toast.success('User created');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const meId = String(me?._id);

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Only the Super Admin can create and manage users."
        actions={can('users:manage') && <Button onClick={openCreate}>+ Create User</Button>}
      />

      <Toolbar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input placeholder="Search name or username…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="max-w-[220px]" />
          <Select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">All roles</option>
            {['SUPER_ADMIN', 'ACCOUNTANT', 'BIG_BOSS', 'TEACHER'].map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            {['ACTIVE', 'DISABLED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </Toolbar>

      {loading ? (
        <Spinner />
      ) : (
        <Table
          columns={[
            {
              key: 'fullName',
              label: 'Name',
              render: (r) => (
                <span className="font-medium text-gray-900">
                  {r.fullName} {meId === String(r.id) ? <Badge className="bg-green-100 text-green-700 ml-1">YOU</Badge> : null}
                </span>
              ),
            },
            { key: 'username', label: 'Username', render: (r) => <span className="text-gray-600">@{r.username}</span> },
            { key: 'email', label: 'Email', render: (r) => r.email || '—' },
            { key: 'role', label: 'Role', render: (r) => <Badge className="bg-green-50 text-green-700">{roleLabel(r.role)}</Badge> },
            {
              key: 'classTeacherOf',
              label: 'Class Reader',
              render: (r) =>
                r.role === 'TEACHER'
                  ? classes.find((c) => c._id === String(r.classTeacherOf))?.name || '—'
                  : '—',
            },
            { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
            { key: 'lastLoginAt', label: 'Last Login', render: (r) => (r.lastLoginAt ? formatDateTime(r.lastLoginAt) : 'Never') },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (r) =>
                can('users:manage') && (
                  <button onClick={() => openEdit(r)} className="text-sm font-medium text-green-700 hover:underline">Edit</button>
                ),
            },
          ]}
          rows={rows}
          emptyTitle="No users found"
          page={page}
          pages={pages}
          total={total}
          onPage={setPage}
        />
      )}

      <Modal
        open={modal}
        onClose={() => setModal(null)}
        title={editing ? `Edit ${editing.fullName}` : 'Create User'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}</Button>
          </>
        }
      >
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. John Mugisha" />
          </Field>
          <Field label="Username" required>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. john.mugisha" />
          </Field>
          <Field label="Email" hint="Optional">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. john@example.com" />
          </Field>
          <Field label={editing ? 'New Password (leave blank to keep)' : 'Password'} required>
            <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" placeholder="e.g. Minimum 8 characters" />
          </Field>
          <Field label="Role" required>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={editing && editing.id !== undefined && String(editing.id) === meId}>
              {['SUPER_ADMIN', 'ACCOUNTANT', 'BIG_BOSS', 'TEACHER'].map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </Select>
          </Field>
          <Field label="Status" required>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </Select>
          </Field>

          {form.role === 'TEACHER' && (
            <div className="sm:col-span-2 rounded-xl border border-green-100 bg-green-50/50 p-4">
              <p className="mb-3 text-sm font-semibold text-green-800">Teaching assignments</p>
              <Field label="Class reader of (homeroom)" required hint="A teacher takes daily attendance for this class only.">
                <Select value={form.classTeacherOf} onChange={(e) => setForm({ ...form, classTeacherOf: e.target.value })}>
                  <option value="">Select class</option>
                  {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </Select>
              </Field>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Subjects taught (class + subject)</span>
                  <Button type="button" variant="secondary" onClick={addAssignment}>+ Add subject</Button>
                </div>
                {!form.teachingAssignments.length && (
                  <p className="rounded-lg bg-white px-3 py-2 text-xs text-gray-500">
                    No subjects yet. A teacher can teach many subjects across many classes.
                  </p>
                )}
                <div className="space-y-2">
                  {form.teachingAssignments.map((a, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-2">
                      <Field label="Class" className="min-w-[120px] flex-1">
                        <Select value={a.class} onChange={(e) => updateAssignment(i, { class: e.target.value })}>
                          <option value="">Class</option>
                          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </Select>
                      </Field>
                      <Field label="Subject" className="min-w-[160px] flex-1">
                        <Select value={a.subject} onChange={(e) => updateAssignment(i, { subject: e.target.value })}>
                          {SUBJECTS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                        </Select>
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeAssignment(i)}
                        className="mb-0.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="sm:col-span-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
            Accountant and Big Boss can never be given Super Admin privileges unless the Super Admin changes their role here.
            Teachers are added here by the administrator.
          </p>
        </form>
      </Modal>
    </div>
  );
}