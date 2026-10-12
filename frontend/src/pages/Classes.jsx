import { useEffect, useState, useCallback } from 'react';
import { get, post, put, apiDelete } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { statusColor } from '../utils/format.js';
import { isIntInRange } from '../utils/validate.js';
import { PageHeader, Spinner, Badge, Toolbar } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Modal } from '../components/Modal.jsx';
import { Button, Field, Input, Select } from '../components/Fields.jsx';

export default function Classes() {
  const { can } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', level: 'PRIMARY', order: 0, status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/classes');
      setItems(d.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setModal('create');
    setForm({ name: '', level: 'PRIMARY', order: items.length + 1, status: 'ACTIVE' });
  };
  const openEdit = (c) => {
    setModal(c);
    setForm({ name: c.name, level: c.level, order: c.order, status: c.status });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Class name is required');
    if (!isIntInRange(form.order, 0, 999)) return toast.error('Enter a valid whole-number display order (0 or more)');
    setSaving(true);
    try {
      if (modal === 'create') {
        await post('/classes', form);
        toast.success('Class created');
      } else {
        await put(`/classes/${modal._id}`, form);
        toast.success('Class updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async (c) => {
    try {
      await apiDelete(`/classes/${c._id}`);
      toast.success('Class deactivated');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Manage the school’s classes. Classes are not hardcoded and can be extended anytime."
        actions={can('classes:manage') && <Button onClick={openCreate}>+ Add Class</Button>}
      />

      {loading ? (
        <Spinner />
      ) : (
        <Table
          columns={[
            { key: 'name', label: 'Class', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
            { key: 'level', label: 'Level', render: (r) => r.level },
            { key: 'order', label: 'Order' },
            { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (r) =>
                can('classes:manage') && (
                  <span className="flex justify-end gap-3 text-sm">
                    <button onClick={() => openEdit(r)} className="font-medium text-green-700 hover:underline">Edit</button>
                    {r.status === 'ACTIVE' && (
                      <button onClick={() => archive(r)} className="font-medium text-red-600 hover:underline">Deactivate</button>
                    )}
                  </span>
                ),
            },
          ]}
          rows={items}
          emptyTitle="No classes configured"
        />
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add Class' : `Edit ${modal?.name || ''}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Class Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. P6" />
          </Field>
          <Field label="Level">
            <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="NURSERY">Nursery</option>
              <option value="PRIMARY">Primary</option>
            </Select>
          </Field>
          <Field label="Display Order">
            <Input type="number" min="0" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} placeholder="e.g. 1" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
