import { useEffect, useState, useCallback } from 'react';
import { get, post } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Spinner, StatCard, EmptyState, Badge } from '../components/ui.jsx';
import { Button, Input, Select, Field } from '../components/Fields.jsx';
import { statusColor } from '../utils/format.js';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE'];

function todayInput() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function Attendance() {
  const toast = useToast();
  const { user, can } = useAuth();
  const [me, setMe] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayInput());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get('/teaching/me')
      .then((d) => {
        setMe(d);
        const list = d.classes || [];
        setClasses(list);
        const homeroom = list.find((c) => c.isHomeroom);
        setClassId(homeroom?._id || list[0]?._id || '');
      })
      .catch((e) => toast.error(e.message));
  }, [toast]);

  const isTeacher = user?.role === 'TEACHER';
  const canMark = can('attendance:mark');
  const homeroom = me?.homeroom;

  const load = useCallback(async () => {
    if (!classId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const d = await get('/teaching/attendance', { class: classId, date });
      setRows((d.items || []).map((r) => ({ ...r, status: r.status || '', reason: r.reason || '' })));
    } catch (e) {
      toast.error(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [classId, date, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = (id, status) => {
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, status, reason: status === 'ABSENT' ? r.reason : '' } : r)));
  };
  const setReason = (id, reason) => {
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, reason } : r)));
  };

  const markAllPresent = () => {
    setRows((rs) => rs.map((r) => ({ ...r, status: r.status || 'PRESENT', reason: r.status === 'ABSENT' ? '' : r.reason })));
  };

  const summary = {
    present: rows.filter((r) => r.status === 'PRESENT').length,
    absent: rows.filter((r) => r.status === 'ABSENT').length,
    late: rows.filter((r) => r.status === 'LATE').length,
    unmarked: rows.filter((r) => !r.status).length,
  };

  const save = async () => {
    if (!classId) return toast.error('Select a class');
    if (!rows.length) return toast.error('No students to mark');
    if (rows.some((r) => !r.status)) return toast.error('Please mark every student before saving');
    if (rows.some((r) => r.status === 'ABSENT' && r.reason.trim().length < 3)) {
      return toast.error('Every absent student needs a reason (at least 3 characters)');
    }
    setSaving(true);
    try {
      await post('/teaching/attendance', {
        class: classId,
        date,
        records: rows.map((r) => ({ student: r._id, status: r.status, reason: r.reason })),
      });
      toast.success('Attendance saved');
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isTeacher && me && !homeroom) {
    return (
      <div>
        <PageHeader title="Attendance" />
        <EmptyState
          title="No class assigned"
          message="You are not yet the class-reader of any class. Ask the Super Admin to assign you as a class reader."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={homeroom ? `Daily attendance for your class-reader class: ${homeroom.name}` : 'Take daily attendance for a class.'}
        actions={
          canMark ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={markAllPresent} disabled={!rows.length}>Mark all present</Button>
              <Button onClick={save} disabled={saving || !rows.length}>{saving ? 'Saving…' : 'Save attendance'}</Button>
            </div>
          ) : null
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Present" value={summary.present} icon="bi-check-circle" tone="green" />
        <StatCard label="Absent" value={summary.absent} icon="bi-x-circle" tone="red" />
        <StatCard label="Late" value={summary.late} icon="bi-clock-history" tone="amber" />
        <StatCard label="Not marked" value={summary.unmarked} icon="bi-question-circle" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <Field label="Class">
          <Select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={isTeacher}
          >
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}{c.isHomeroom ? ' (my class)' : ''}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={date} max={todayInput()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {loading ? (
        <Spinner />
      ) : !rows.length ? (
        <EmptyState title="No students" message="This class has no active students." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="scroll-thin overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reason (required when absent)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={r._id} className="hover:bg-green-50/40">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-900">{r.fullName}</p>
                      <p className="text-xs text-gray-400">{r.studentId}</p>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(r._id, s)}
                            disabled={!canMark}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                              r.status === s ? statusColor(s) + ' ring-1 ring-inset ring-black/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {s[0] + s.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {r.status === 'ABSENT' ? (
                        <Input
                          value={r.reason}
                          onChange={(e) => setReason(r._id, e.target.value)}
                          disabled={!canMark}
                          placeholder="e.g. Sick, family emergency…"
                          className="min-w-[240px]"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <Badge className="bg-green-50 text-green-700">Tip</Badge>
        Attendance is locked to the class-reader class and cannot be recorded for a future date.
      </div>
    </div>
  );
}
