import { useEffect, useState, useCallback } from 'react';
import { get, post, put } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, statusColor } from '../utils/format.js';
import { PageHeader, Spinner, Badge, Toolbar } from '../components/ui.jsx';
import { Modal } from '../components/Modal.jsx';
import { Button, Field, Input, Select } from '../components/Fields.jsx';

export default function AcademicYears() {
  const { can } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearModal, setYearModal] = useState(null);
  const [termModal, setTermModal] = useState(null);
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isActive: true });
  const [termForm, setTermForm] = useState({ name: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/academic-years');
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

  const saveYear = async (e) => {
    e.preventDefault();
    if (!yearForm.name.trim()) return toast.error('Academic year name is required');
    if (!yearForm.startDate) return toast.error('Start date is required');
    if (!yearForm.endDate) return toast.error('End date is required');
    if (yearForm.endDate < yearForm.startDate) return toast.error('End date must be after start date');
    setSaving(true);
    try {
      if (yearModal === 'create') {
        await post('/academic-years', yearForm);
        toast.success('Academic year created');
      } else {
        await put(`/academic-years/${yearModal._id}`, yearForm);
        toast.success('Academic year updated');
      }
      setYearModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveTerm = async (e) => {
    e.preventDefault();
    if (!termForm.name.trim()) return toast.error('Term name is required');
    if (!termForm.startDate) return toast.error('Start date is required');
    if (!termForm.endDate) return toast.error('End date is required');
    if (termForm.endDate < termForm.startDate) return toast.error('End date must be after start date');
    setSaving(true);
    try {
      if (termModal.termId) {
        await put(`/academic-years/${termModal.yearId}/terms/${termModal.termId}`, termForm);
        toast.success('Term updated');
      } else {
        await post(`/academic-years/${termModal.yearId}/terms`, termForm);
        toast.success('Term added');
      }
      setTermModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Academic Years & Terms"
        subtitle="Every payment, student and report is tied to an academic year and term."
        actions={
          can('academicYears:manage') && (
            <Button
              onClick={() => {
                setYearForm({ name: '', startDate: '', endDate: '', isActive: true });
                setYearModal('create');
              }}
            >
              + Add Academic Year
            </Button>
          )
        }
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((y) => (
            <div key={y._id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{y.name}</h2>
                    {y.isActive && <Badge className="bg-green-100 text-green-700">ACTIVE YEAR</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDate(y.startDate)} → {formatDate(y.endDate)}
                  </p>
                </div>
                {can('academicYears:manage') && (
                  <button
                    onClick={() => {
                      setYearForm({
                        name: y.name,
                        startDate: y.startDate ? y.startDate.slice(0, 10) : '',
                        endDate: y.endDate ? y.endDate.slice(0, 10) : '',
                        isActive: y.isActive,
                      });
                      setYearModal(y);
                    }}
                    className="text-sm font-medium text-green-700 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {(y.terms || []).map((t) => (
                  <div key={t._id || t.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(t.startDate)} → {formatDate(t.endDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={t.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}>
                        {t.status}
                      </Badge>
                      {can('academicYears:manage') && (
                        <button
                          onClick={() => {
                            setTermForm({
                              name: t.name,
                              startDate: t.startDate ? t.startDate.slice(0, 10) : '',
                              endDate: t.endDate ? t.endDate.slice(0, 10) : '',
                            });
                            setTermModal({ yearId: y._id, termId: t._id });
                          }}
                          className="text-xs font-medium text-green-700 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {can('academicYears:manage') && (
                  <button
                    onClick={() => {
                      setTermForm({ name: '', startDate: '', endDate: '' });
                      setTermModal({ yearId: y._id });
                    }}
                    className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-500 hover:border-green-400 hover:text-green-600"
                  >
                    + Add Term
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!yearModal}
        onClose={() => setYearModal(null)}
        title={yearModal === 'create' ? 'Add Academic Year' : 'Edit Academic Year'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setYearModal(null)}>Cancel</Button>
            <Button onClick={saveYear} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={saveYear} className="space-y-4">
          <Field label="Academic Year Name" required hint="Example: 2026-2027">
            <Input value={yearForm.name} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} placeholder="e.g. 2026-2027" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Start Date" required>
              <Input type="date" value={yearForm.startDate} onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })} />
            </Field>
            <Field label="End Date" required>
              <Input type="date" value={yearForm.endDate} onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={yearForm.isActive}
              onChange={(e) => setYearForm({ ...yearForm, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Set as the active academic year
          </label>
        </form>
      </Modal>

      <Modal
        open={!!termModal}
        onClose={() => setTermModal(null)}
        title={termModal?.termId ? 'Edit Term' : 'Add Term'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTermModal(null)}>Cancel</Button>
            <Button onClick={saveTerm} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={saveTerm} className="space-y-4">
          <Field label="Term Name" required hint="Example: Term 1">
            <Input value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} placeholder="e.g. Term 1" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Start Date" required>
              <Input type="date" value={termForm.startDate} onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })} />
            </Field>
            <Field label="End Date" required>
              <Input type="date" value={termForm.endDate} onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })} />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
