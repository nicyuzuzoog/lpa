import { useEffect, useState } from 'react';
import { get, post } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { roleLabel } from '../utils/format.js';
import { Button, Field, Input, Select, Textarea } from './Fields.jsx';
import { Modal } from './Modal.jsx';

const ROLES = ['SUPER_ADMIN', 'ACCOUNTANT', 'BIG_BOSS', 'TEACHER'];

// Compose a manual reminder (NOTIFICATIONS module). With no role ticked the
// reminder goes to every active user; a student can optionally be attached so
// the message clearly points at one child (e.g. an outstanding balance).
export function ReminderModal({ open, onClose, onSent, student = null, defaultTitle = '', defaultMessage = '' }) {
  const { can } = useAuth();
  const toast = useToast();
  const canReadStudents = can('students:read');
  const [form, setForm] = useState({ title: '', message: '', roles: [], student: '' });
  const [students, setStudents] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ title: defaultTitle, message: defaultMessage, roles: [], student: student?._id || '' });
    if (canReadStudents) {
      get('/students', { limit: 200 }).then((d) => setStudents(d.items || [])).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?._id, defaultTitle, defaultMessage, canReadStudents]);

  const toggleRole = (role) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (form.message.trim().length < 3) return toast.error('Enter a reminder message');
    setSending(true);
    try {
      const res = await post('/notifications/reminders', {
        title: form.title.trim(),
        message: form.message.trim(),
        roles: form.roles,
        student: form.student || null,
      });
      toast.success(`Reminder sent to ${res.recipients} user${res.recipients === 1 ? '' : 's'}`);
      onSent?.(res);
      onClose?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send a reminder"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={sending}>{sending ? 'Sending…' : 'Send reminder'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" hint="Optional — defaults to “Reminder”.">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. School fees reminder" />
        </Field>
        <Field label="Message" required>
          <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="e.g. Kindly clear the outstanding balance before the end of the term." />
        </Field>
        <Field label="Send to" hint="Leave all unticked to send to every active user.">
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => toggleRole(r)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${form.roles.includes(r) ? 'bg-green-600 text-white' : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {roleLabel(r)}
              </button>
            ))}
          </div>
        </Field>
        {canReadStudents && (
          <Field label="About a student" hint="Optional — ties the reminder to a child (e.g. an outstanding balance).">
            <Select value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
              <option value="">Not about a specific student</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.studentId} · {s.firstName} {s.lastName}</option>
              ))}
            </Select>
          </Field>
        )}
      </form>
    </Modal>
  );
}
