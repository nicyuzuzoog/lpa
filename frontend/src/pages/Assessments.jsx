import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get, post } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, statusColor } from '../utils/format.js';
import { subjectLabel } from '../utils/subjects.js';
import { PageHeader, Spinner, Badge, Toolbar } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Modal } from '../components/Modal.jsx';
import { Button, Field, Input, Select } from '../components/Fields.jsx';

const EMPTY = { title: '', class: '', subject: '', maxMarks: 40, passMark: '', term: '', assessmentDate: '' };

function todayInput() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function Assessments() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ class: '', subject: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, assessmentDate: todayInput() });
  const [saving, setSaving] = useState(false);

  const isTeacher = user?.role === 'TEACHER';
  const classes = me?.classes || [];
  const allSubjects = me?.subjects || [];
  const selectedClass = classes.find((c) => c._id === form.class);
  const subjectOptions = isTeacher && selectedClass ? allSubjects.filter((s) => selectedClass.subjects?.includes(s.code)) : allSubjects;

  useEffect(() => {
    Promise.all([get('/teaching/me'), get('/academic-years')])
      .then(([m, y]) => {
        setMe(m);
        const active = (y.items || []).find((x) => x.isActive);
        const term = active?.terms?.find((t) => t.status === 'ACTIVE')?.name || active?.terms?.[0]?.name || '';
        setForm((f) => (f.term ? f : { ...f, term }));
      })
      .catch((e) => toast.error(e.message));
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/teaching/assessments', filters);
      setRows(d.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    const firstClass = classes[0];
    setForm((f) => ({
      ...EMPTY,
      term: f.term,
      assessmentDate: todayInput(),
      class: firstClass?._id || '',
      subject: isTeacher ? firstClass?.subjects?.[0] || '' : allSubjects[0]?.code || '',
    }));
    setModal(true);
  };

  const onClassChange = (classId) => {
    const cls = classes.find((c) => c._id === classId);
    const subject = isTeacher ? cls?.subjects?.[0] || '' : form.subject || allSubjects[0]?.code || '';
    setForm({ ...form, class: classId, subject });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.class) return toast.error('Select a class');
    if (!form.subject) return toast.error('Select a subject');
    const max = Number(form.maxMarks);
    if (!Number.isInteger(max) || max < 1 || max > 100) return toast.error('Total marks must be a whole number 1–100');
    if (form.passMark !== '' && form.passMark != null) {
      const p = Number(form.passMark);
      if (!Number.isInteger(p) || p < 0 || p > max) return toast.error('Pass mark must be between 0 and the total marks');
    }
    setSaving(true);
    try {
      const d = await post('/teaching/assessments', {
        title: form.title.trim(),
        class: form.class,
        subject: form.subject,
        maxMarks: max,
        passMark: form.passMark === '' ? null : Number(form.passMark),
        term: form.term,
        assessmentDate: form.assessmentDate || undefined,
      });
      toast.success('Assessment created');
      setModal(false);
      navigate(`/app/assessments/${d.item._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Assessments"
        subtitle="Create assessments for the subjects you teach, then enter marks and generate reports."
        actions={<Button onClick={openCreate} disabled={!classes.length}>+ New Assessment</Button>}
      />

      <Toolbar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Select value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <Select value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })}>
            <option value="">All subjects</option>
            {allSubjects.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </Select>
        </div>
      </Toolbar>

      {loading ? (
        <Spinner />
      ) : (
        <Table
          columns={[
            {
              key: 'title',
              label: 'Assessment',
              render: (r) => (
                <Link to={`/app/assessments/${r._id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-green-700">
                  {r.title}
                </Link>
              ),
            },
            { key: 'class', label: 'Class', render: (r) => r.class?.name || '—' },
            { key: 'subject', label: 'Subject', render: (r) => r.subjectName || subjectLabel(r.subject) },
            { key: 'maxMarks', label: 'Total', className: 'text-right', render: (r) => `${r.maxMarks} marks` },
            { key: 'graded', label: 'Graded', className: 'text-right', render: (r) => `${r.graded} / ${r.totalMarks}` },
            { key: 'assessmentDate', label: 'Date', render: (r) => formatDate(r.assessmentDate) },
            { key: 'status', label: 'Status', render: (r) => <Badge className={r.status === 'OPEN' ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}>{r.status}</Badge> },
            {
              key: 'actions',
              label: '',
              className: 'text-right',
              render: (r) => (
                <Link to={`/app/assessments/${r._id}`} className="text-sm font-medium text-green-700 dark:text-green-400 hover:underline">
                  {r.graded < r.totalMarks ? 'Enter marks' : 'View report'}
                </Link>
              ),
            },
          ]}
          rows={rows}
          emptyTitle="No assessments yet"
          emptyMessage="Create your first assessment to start entering marks."
        />
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New Assessment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
          </>
        }
      >
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Assessment 1 — Kinyarwanda" />
          </Field>
          <Field label="Class" required>
            <Select value={form.class} onChange={(e) => onClassChange(e.target.value)}>
              <option value="">Select class</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.name}{c.isHomeroom ? ' (my class)' : ''}</option>)}
            </Select>
          </Field>
          <Field label="Subject" required>
            <Select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option value="">Select subject</option>
              {subjectOptions.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Total marks" required hint="e.g. 40">
            <Input type="number" min="1" max="100" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
          </Field>
          <Field label="Pass mark" hint="Blank = 50% of total">
            <Input type="number" min="0" value={form.passMark} onChange={(e) => setForm({ ...form, passMark: e.target.value })} />
          </Field>
          <Field label="Term">
            <Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} placeholder="e.g. Term 1" />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.assessmentDate} onChange={(e) => setForm({ ...form, assessmentDate: e.target.value })} />
          </Field>
          {isTeacher && selectedClass && (
            <p className="sm:col-span-2 rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              You can only create assessments for subjects you teach in {selectedClass.name} and the classes on your teaching list.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
