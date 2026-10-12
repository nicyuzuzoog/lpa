import { useEffect, useState, useCallback } from 'react';
import { get } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { exportPdf, exportExcel } from '../utils/export.js';
import { PageHeader, Spinner, StatCard, Badge, EmptyState, Toolbar } from '../components/ui.jsx';
import { Select, Button } from '../components/Fields.jsx';
import { subjectLabel } from '../utils/subjects.js';

export default function PerformanceReport() {
  const toast = useToast();
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [filters, setFilters] = useState({ class: '', subject: '', term: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const isTeacher = user?.role === 'TEACHER';
  const classes = me?.classes || [];
  const allSubjects = me?.subjects || [];

  useEffect(() => {
    get('/teaching/me')
      .then((m) => {
        setMe(m);
        setFilters((f) => ({ ...f, class: m.classes?.[0]?._id || '' }));
      })
      .catch((e) => toast.error(e.message));
  }, [toast]);

  const load = useCallback(async () => {
    if (!filters.class) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const d = await get('/teaching/report', filters);
      setData(d);
    } catch (e) {
      toast.error(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.rows || [];
  const summary = data?.summary;

  const exportCols = [
    { key: 'position', label: 'Position' },
    { key: 'studentId', label: 'Student ID' },
    { key: 'name', label: 'Student' },
    { key: 'obtained', label: 'Obtained' },
    { key: 'totalMax', label: 'Total' },
    { key: 'percentage', label: 'Percentage' },
    { key: 'result', label: 'Result' },
  ];

  const exportRows = () =>
    [...rows]
      .sort((a, b) => (a.position || 999) - (b.position || 999))
      .map((r) => ({
        position: r.position || '',
        studentId: r.student.studentId,
        name: r.student.fullName,
        obtained: r.obtained,
        totalMax: r.totalMax,
        percentage: r.percentage == null ? '' : `${r.percentage}%`,
        result: r.passed == null ? 'NOT GRADED' : r.passed ? 'PASS' : 'FAIL',
      }));

  const className = data?.class?.name || classes.find((c) => c._id === filters.class)?.name || '';

  const doPdf = () =>
    exportPdf({
      title: `Class Performance Report — ${className}`,
      subtitle: `${filters.subject ? subjectLabel(filters.subject) : 'All subjects'}${filters.term ? ` · ${filters.term}` : ''}`,
      columns: exportCols,
      rows: exportRows(),
      fileName: `performance-${className}`.replace(/\s+/g, '-').toLowerCase(),
    }).catch((e) => toast.error(e.message));

  const doExcel = () =>
    exportExcel({
      title: `Class Performance Report — ${className}`,
      columns: exportCols,
      rows: exportRows(),
      fileName: `performance-${className}`.replace(/\s+/g, '-').toLowerCase(),
      sheetName: 'Performance',
    }).catch((e) => toast.error(e.message));

  return (
    <div>
      <PageHeader
        title="Performance Report"
        subtitle="Overall performance across every assessment for a class — how students passed generally."
        actions={
          <>
            <Button variant="secondary" onClick={doPdf} disabled={!rows.length}><i className="bi bi-file-earmark-pdf" /> PDF</Button>
            <Button variant="secondary" onClick={doExcel} disabled={!rows.length}><i className="bi bi-file-earmark-excel" /> Excel</Button>
          </>
        }
      />

      <Toolbar>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Select value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })}>
            <option value="">Select class</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name}{c.isHomeroom ? ' (my class)' : ''}</option>)}
          </Select>
          <Select value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })}>
            <option value="">All subjects</option>
            {(isTeacher && classes.find((c) => c._id === filters.class)?.subjects
              ? allSubjects.filter((s) => classes.find((c) => c._id === filters.class)?.subjects?.includes(s.code))
              : allSubjects
            ).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </Select>
          <Select value={filters.term} onChange={(e) => setFilters({ ...filters, term: e.target.value })}>
            <option value="">All terms</option>
            {['Term 1', 'Term 2', 'Term 3'].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
      </Toolbar>

      {loading ? (
        <Spinner />
      ) : !data ? (
        <EmptyState title="Select a class" message="Choose a class to build its performance report." />
      ) : !data.assessments.length ? (
        <EmptyState title="No assessments" message="This class has no assessments yet, so there is nothing to report." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Assessments" value={data.assessments.length} icon="bi-clipboard-data" tone="green" />
            <StatCard label="Students" value={summary.totalStudents} icon="bi-people" />
            <StatCard label="Passed" value={summary.passed} icon="bi-trophy" tone="green" />
            <StatCard label="Failed" value={summary.failed} icon="bi-exclamation-triangle" tone="red" />
            <StatCard label="Average" value={`${summary.averagePct}%`} icon="bi-graph-up" tone="amber" sub={`Pass rate ${summary.passRate}%`} />
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {data.assessments.map((a) => (
              <Badge key={a._id} className="bg-gray-100 text-gray-600">
                {a.title} · {subjectLabel(a.subject)} · /{a.maxMarks}
              </Badge>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="scroll-thin overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pos</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Student</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Obtained</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">%</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...rows]
                    .sort((a, b) => (a.position || 999) - (b.position || 999))
                    .map((r) => (
                      <tr key={r.student._id} className="hover:bg-green-50/40">
                        <td className="px-4 py-2 font-medium text-gray-500">{r.position || '—'}</td>
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-900">{r.student.fullName}</p>
                          <p className="text-xs text-gray-400">{r.student.studentId}</p>
                        </td>
                        <td className="px-4 py-2 text-right">{r.totalMax ? `${r.obtained} / ${r.totalMax}` : '—'}</td>
                        <td className="px-4 py-2 text-right font-medium">{r.percentage == null ? '—' : `${r.percentage}%`}</td>
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
    </div>
  );
}
