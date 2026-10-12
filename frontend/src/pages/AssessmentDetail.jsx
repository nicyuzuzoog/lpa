import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { get, put } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../utils/format.js';
import { subjectLabel } from '../utils/subjects.js';
import { exportPdf, exportExcel } from '../utils/export.js';
import { isBlank, isIntInRange } from '../utils/validate.js';
import { PageHeader, Spinner, StatCard, Badge, EmptyState } from '../components/ui.jsx';
import { Modal } from '../components/Modal.jsx';
import { Button, Field, Input } from '../components/Fields.jsx';

export default function AssessmentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('marks');
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', maxMarks: 40, passMark: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get(`/teaching/assessments/${id}`);
      setData(d);
      const m = {};
      for (const r of d.report.rows) {
        m[r.student._id] = { score: r.score == null ? '' : String(r.score), remark: r.remark || '' };
      }
      setMarks(m);
      setEditForm({
        title: d.item.title,
        maxMarks: d.item.maxMarks,
        passMark: d.item.passMark ?? '',
      });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const item = data?.item;
  const report = data?.report;
  const max = item?.maxMarks || 0;

  const localStats = useMemo(() => {
    const vals = Object.values(marks)
      .map((m) => m.score)
      .filter((v) => v !== '' && v != null)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    const passMark = item?.passMark ?? Math.ceil(max * 0.5);
    return {
      graded: vals.length,
      passed: vals.filter((v) => v >= passMark).length,
    };
  }, [marks, item, max]);

  const validateMarks = () => {
    for (const [sid, m] of Object.entries(marks)) {
      if (m.score === '' || m.score == null) continue;
      const n = Number(m.score);
      if (!Number.isInteger(n)) return { error: 'Marks must be whole numbers (no worked marks).' };
      if (n < 0 || n > max) return { error: `Marks must be between 0 and ${max}.` };
    }
    return {};
  };

  const saveMarks = async () => {
    const { error } = validateMarks();
    if (error) return toast.error(error);
    setSaving(true);
    try {
      const payload = {
        marks: Object.entries(marks).map(([student, m]) => ({
          student,
          score: m.score === '' ? null : Number(m.score),
          remark: m.remark,
        })),
      };
      await put(`/teaching/assessments/${id}/marks`, payload);
      toast.success('Marks saved');
      await load();
      setTab('report');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    setBusy(true);
    try {
      const next = item.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      await put(`/teaching/assessments/${id}`, { status: next });
      toast.success(next === 'CLOSED' ? 'Assessment closed' : 'Assessment reopened');
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (isBlank(editForm.title)) return toast.error('Assessment title is required');
    if (!isIntInRange(editForm.maxMarks, 1, 100)) return toast.error('Total marks must be a whole number 1–100');
    const max = Number(editForm.maxMarks);
    if (editForm.passMark !== '' && editForm.passMark != null && !isIntInRange(editForm.passMark, 0, max)) {
      return toast.error('Pass mark must be a whole number between 0 and the total marks');
    }
    setBusy(true);
    try {
      await put(`/teaching/assessments/${id}`, {
        title: editForm.title.trim(),
        maxMarks: max,
        passMark: editForm.passMark === '' ? null : Number(editForm.passMark),
      });
      toast.success('Assessment updated');
      setEditOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const exportRows = () =>
    (report?.rows || []).map((r) => ({
      studentId: r.student.studentId,
      name: r.student.fullName,
      score: r.score == null ? '' : r.score,
      max: report.maxMarks,
      percentage: r.percentage == null ? '' : `${r.percentage}%`,
      result: r.passed == null ? 'NOT GRADED' : r.passed ? 'PASS' : 'FAIL',
      position: r.position || '',
    }));

  const doPdf = () => {
    exportPdf({
      title: `Assessment Report — ${item.title}`,
      subtitle: `${item.class?.name || ''} · ${subjectLabel(item.subject)} · ${item.term || ''}`,
      columns: [
        { key: 'position', label: 'Pos' },
        { key: 'studentId', label: 'ID' },
        { key: 'name', label: 'Student' },
        { key: 'score', label: `Score / ${report.maxMarks}` },
        { key: 'percentage', label: '%' },
        { key: 'result', label: 'Result' },
      ],
      rows: exportRows().sort((a, b) => (a.position || 999) - (b.position || 999)),
      fileName: `assessment-${item.title}`.replace(/\s+/g, '-').toLowerCase(),
    }).catch((e) => toast.error(e.message));
  };

  const doExcel = () => {
    exportExcel({
      title: `Assessment Report — ${item.title}`,
      columns: [
        { key: 'position', label: 'Position' },
        { key: 'studentId', label: 'Student ID' },
        { key: 'name', label: 'Student' },
        { key: 'score', label: 'Score' },
        { key: 'max', label: 'Total' },
        { key: 'percentage', label: 'Percentage' },
        { key: 'result', label: 'Result' },
      ],
      rows: exportRows().sort((a, b) => (a.position || 999) - (b.position || 999)),
      fileName: `assessment-${item.title}`.replace(/\s+/g, '-').toLowerCase(),
      sheetName: 'Assessment',
    }).catch((e) => toast.error(e.message));
  };

  if (loading) return <Spinner />;
  if (!data || !item) return <EmptyState title="Assessment not found" />;

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'TEACHER';
  const locked = item.status === 'CLOSED';

  return (
    <div>
      <PageHeader
        title={item.title}
        subtitle={`${item.class?.name || ''} · ${subjectLabel(item.subject)} · ${item.term || 'No term'} · ${formatDate(item.assessmentDate)}`}
        actions={
          <>
            <Link to="/app/assessments" className="text-sm font-medium text-gray-500 hover:text-green-700">← Back</Link>
            {canManage && <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>}
            <Button variant="secondary" onClick={doPdf}><i className="bi bi-file-earmark-pdf" /> PDF</Button>
            <Button variant="secondary" onClick={doExcel}><i className="bi bi-file-earmark-excel" /> Excel</Button>
            {canManage && (
              <Button variant={locked ? 'primary' : 'secondary'} onClick={toggleStatus} disabled={busy}>
                {locked ? 'Reopen' : 'Close assessment'}
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total marks" value={item.maxMarks} icon="bi-100-circle" tone="green" />
        <StatCard label="Pass mark" value={item.passMark} icon="bi-check2-circle" />
        <StatCard label="Graded" value={`${report.summary.graded} / ${report.summary.totalStudents}`} icon="bi-pencil-square" />
        <StatCard label="Status" value={item.status} icon="bi-lock" tone={locked ? 'amber' : 'green'} />
      </div>

      <div className="scroll-thin mb-4 flex gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
        <button
          onClick={() => setTab('marks')}
          className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${tab === 'marks' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Marks Entry (local: {localStats.graded} graded, {localStats.passed} pass)
        </button>
        <button
          onClick={() => setTab('report')}
          className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${tab === 'report' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Report
        </button>
      </div>

      {tab === 'marks' ? (
        <>
          {locked && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              This assessment is closed. Marks are read-only.
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="scroll-thin overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Score / {max}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.students.map((s, i) => {
                    const m = marks[s._id] || { score: '', remark: '' };
                    const n = m.score === '' ? null : Number(m.score);
                    const invalid = n != null && (!Number.isInteger(n) || n < 0 || n > max);
                    return (
                      <tr key={s._id} className="hover:bg-green-50/40">
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-900">{s.fullName}</p>
                          <p className="text-xs text-gray-400">{s.studentId}</p>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            max={max}
                            step="1"
                            disabled={locked || !canManage}
                            value={m.score}
                            onChange={(e) => setMarks((prev) => ({ ...prev, [s._id]: { ...m, score: e.target.value } }))}
                            className={`w-24 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                              invalid ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:border-green-500 focus:ring-green-100'
                            } disabled:bg-gray-50`}
                            placeholder="—"
                          />
                          {invalid && <p className="mt-1 text-xs text-red-600">0–{max} whole numbers only</p>}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            disabled={locked || !canManage}
                            value={m.remark}
                            maxLength={200}
                            onChange={(e) => setMarks((prev) => ({ ...prev, [s._id]: { ...m, remark: e.target.value } }))}
                            className="w-full min-w-[200px] rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100 disabled:bg-gray-50"
                            placeholder="Optional remark"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {canManage && !locked && (
            <div className="mt-3 flex justify-end">
              <Button onClick={saveMarks} disabled={saving}>{saving ? 'Saving…' : 'Save marks'}</Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Passed" value={report.summary.passed} icon="bi-trophy" tone="green" />
            <StatCard label="Failed" value={report.summary.failed} icon="bi-exclamation-triangle" tone="red" />
            <StatCard label="Pass rate" value={`${report.summary.passRate}%`} icon="bi-percent" />
            <StatCard label="Average" value={`${report.summary.averagePct}%`} icon="bi-graph-up" tone="amber" sub={`${report.summary.average} / ${report.maxMarks}`} />
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <Badge className="bg-green-100 text-green-700">PASS ≥ {report.passMark}</Badge>
            <Badge className="bg-red-100 text-red-700">FAIL &lt; {report.passMark}</Badge>
            <span>{report.summary.ungraded} not graded</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="scroll-thin overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pos</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Score</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">%</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...report.rows]
                    .sort((a, b) => (a.position || 999) - (b.position || 999))
                    .map((r) => (
                      <tr key={r.student._id} className="hover:bg-green-50/40">
                        <td className="px-4 py-2 font-medium text-gray-500">{r.position || '—'}</td>
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-900">{r.student.fullName}</p>
                          <p className="text-xs text-gray-400">{r.student.studentId}</p>
                        </td>
                        <td className="px-4 py-2 text-right">{r.score == null ? '—' : `${r.score} / ${report.maxMarks}`}</td>
                        <td className="px-4 py-2 text-right">{r.percentage == null ? '—' : `${r.percentage}%`}</td>
                        <td className="px-4 py-2">
                          {r.passed == null ? (
                            <Badge className="bg-gray-100 text-gray-500">NOT GRADED</Badge>
                          ) : r.passed ? (
                            <Badge className="bg-green-100 text-green-700">PASS</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">FAIL</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Assessment"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={saveEdit} className="grid gap-4">
          <Field label="Title" required>
            <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
          </Field>
          <Field label="Total marks" required hint="Cannot be lower than an existing score">
            <Input type="number" min="1" max="100" value={editForm.maxMarks} onChange={(e) => setEditForm({ ...editForm, maxMarks: e.target.value })} />
          </Field>
          <Field label="Pass mark" hint="Blank = 50% of total">
            <Input type="number" min="0" value={editForm.passMark} onChange={(e) => setEditForm({ ...editForm, passMark: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
