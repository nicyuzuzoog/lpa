import { useEffect, useState, useCallback } from 'react';
import { get, post, put } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDateTime, roleLabel, statusColor } from '../utils/format.js';
import { PageHeader, Spinner, Badge, Toolbar } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Modal } from '../components/Modal.jsx';
import { Button, Field, Input, Select, PasswordInput } from '../components/Fields.jsx';

const EMPTY = { fullName: '', username: '', email: '', password: '', role: 'ACCOUNTANT', status: 'ACTIVE' };

export default function Users() {
  const { user: me, can } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

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
    setForm({ fullName: u.fullName, username: u.username, email: u.email || '', password: '', role: u.role, status: u.status });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.username.trim()) return toast.error('Full name and username are required');
    if (!editing && !form.password) return toast.error('Password is required');
    if (form.password && form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (form.email && (!form.email.includes('@') || !form.email.includes('.'))) return toast.error('Enter a valid email address');
    setSaving(true);
    try {
      if (editing) {
        const payload = { fullName: form.fullName, email: form.email, role: form.role, status: form.status };
        if (form.password) payload.password = form.password;
        await put(`/users/${editing._id}`, payload);
        toast.success('User updated');
      } else {
        await post('/users', form);
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
            {['SUPER_ADMIN', 'ACCOUNTANT', 'BIG_BOSS'].map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
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
              {['SUPER_ADMIN', 'ACCOUNTANT', 'BIG_BOSS'].map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </Select>
          </Field>
          <Field label="Status" required>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </Select>
          </Field>
          <p className="sm:col-span-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
            Accountant and Big Boss can never be given Super Admin privileges unless the Super Admin changes their role here.
          </p>
        </form>
      </Modal>
    </div>
  );
}