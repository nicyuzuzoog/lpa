import { useEffect, useState, useCallback } from 'react';
import { get, post, put, apiDelete } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { statusColor } from '../utils/format.js';
import { SUBJECTS } from '../utils/subjects.js';
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

  const [assignClass, setAssignClass] = useState(null);
  const [assignData, setAssignData] = useState(null);
  const [assignSaving, setAssignSaving] = useState('');

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

  const openAssign = async (c) => {
    setAssignClass(c);
    setAssignData(null);
    try {
      const d = await get(`/teaching/assignments?class=${c._id}`);
      setAssignData(d);
    } catch (e) {
      toast.error(e.message);
      setAssignClass(null);
    }
  };

  const assignedTeacher = (subject) =>
    assignData?.assignments?.find((a) => a.subject === subject)?.teacher?._id || '';

  const setAssignment = async (subject, teacher) => {
    setAssignSaving(subject);
    try {
      const d = await post('/teaching/assignments', { class: assignClass._id, subject, teacher });
      setAssignData((prev) => ({ ...prev, assignments: d.assignments }));
      toast.success(teacher ? 'Teacher assigned' : 'Assignment cleared');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAssignSaving('');
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
            { key: 'name', label: 'Class', render: (r) => <span className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</span> },
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
                    <button onClick={() => openAssign(r)} className="font-medium text-green-700 dark:text-green-400 hover:underline">Teachers</button>
                    <button onClick={() => openEdit(r)} className="font-medium text-green-700 dark:text-green-400 hover:underline">Edit</button>
                    {r.status === 'ACTIVE' && (
                      <button onClick={() => archive(r)} className="font-medium text-red-600 dark:text-red-400 hover:underline">Deactivate</button>
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

      <Modal
        open={!!assignClass}
        onClose={() => setAssignClass(null)}
        title={`Teachers — ${assignClass?.name || ''}`}
        size="md"
        footer={<Button variant="secondary" onClick={() => setAssignClass(null)}>Done</Button>}
      >
        {!assignData ? (
          <Spinner />
        ) : !assignData.teachers.length ? (
          <p className="rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            No teachers yet. Create a teacher from the Users page first.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pick the teacher that teaches each subject in this class. One teacher per subject.
            </p>
            {SUBJECTS.map((s) => (
              <div key={s.code} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1.2fr]">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.name}</span>
                <Select
                  value={assignedTeacher(s.code)}
                  disabled={assignSaving === s.code}
                  onChange={(e) => setAssignment(s.code, e.target.value)}
                >
                  <option value="">Not assigned</option>
                  {assignData.teachers.map((t) => (
                    <option key={t._id} value={t._id}>{t.fullName}</option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
