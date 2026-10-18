import { useEffect, useState, useCallback } from 'react';
import { get, post, put, apiDelete } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { money, statusColor, feeTypeLabel } from '../utils/format.js';
import { isPositive, isIntInRange } from '../utils/validate.js';
import { PageHeader, Spinner, Badge, Toolbar, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Modal } from '../components/Modal.jsx';
import { Button, Field, Input, Select } from '../components/Fields.jsx';

const TABS = [
  { id: 'structures', label: 'Fee Structures' },
  { id: 'items', label: 'Materials & Uniform Items' },
  { id: 'validate', label: 'Component Validation' },
];

export default function Fees() {
  const { can } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('structures');
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({ academicYear: '', term: '', class: '', feeType: '' });
  const [structures, setStructures] = useState([]);
  const [items, setItems] = useState([]);
  const [validation, setValidation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [structForm, setStructForm] = useState({ academicYear: '', term: '', class: '', feeType: 'SCHOOL_FEES', requiredAmount: '' });
  const [itemForm, setItemForm] = useState({ category: 'MATERIAL', name: '', price: '', classes: [], order: 0 });

  useEffect(() => {
    Promise.all([get('/classes'), get('/academic-years')])
      .then(([c, y]) => {
        setClasses(c.items || []);
        const yearItems = y.items || [];
        setYears(yearItems);
        const active = yearItems.find((x) => x.isActive) || yearItems[0];
        if (active) setFilters((f) => ({ ...f, academicYear: active._id, term: active.terms?.find((t) => t.status === 'ACTIVE')?.name || active.terms?.[0]?.name || '' }));
      })
      .catch(() => {});
  }, []);

  const loadStructures = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const d = await get('/fees/structures', params);
      setStructures(d.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const loadItems = useCallback(async () => {
    try {
      const d = await get('/fees/items');
      setItems(d.items || []);
    } catch (e) {
      toast.error(e.message);
    }
  }, [toast]);

  const loadValidation = useCallback(async () => {
    try {
      const d = await get('/fees/validate');
      setValidation(d.items || []);
    } catch (e) {
      toast.error(e.message);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === 'structures') loadStructures();
    if (tab === 'items') loadItems();
    if (tab === 'validate') loadValidation();
  }, [tab, loadStructures, loadItems, loadValidation]);

  const saveStructure = async (e) => {
    e.preventDefault();
    if (!structForm.academicYear || !structForm.term || !structForm.class) return toast.error('Year, term and class are required');
    if (!structForm.feeType) return toast.error('Select a fee type');
    if (!isPositive(structForm.requiredAmount)) return toast.error('Enter a valid required amount greater than 0');
    if (!isIntInRange(structForm.requiredAmount, 1)) return toast.error('Required amount must be a whole number');
    setSaving(true);
    try {
      if (modal?.type === 'structure-edit') {
        await put(`/fees/structures/${modal.data._id}`, structForm);
        toast.success('Fee structure updated');
      } else {
        await post('/fees/structures', structForm);
        toast.success('Fee structure created');
      }
      setModal(null);
      loadStructures();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return toast.error('Item name is required');
    if (!itemForm.category) return toast.error('Select a category');
    if (!isPositive(itemForm.price)) return toast.error('Enter a valid price greater than 0');
    if (!isIntInRange(itemForm.price, 1)) return toast.error('Price must be a whole number');
    setSaving(true);
    try {
      if (modal?.type === 'item-edit') {
        await put(`/fees/items/${modal.data._id}`, itemForm);
        toast.success('Item updated');
      } else {
        await post('/fees/items', itemForm);
        toast.success('Item created');
      }
      setModal(null);
      loadItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const archiveStructure = async (s) => {
    try {
      await apiDelete(`/fees/structures/${s._id}`);
      toast.success('Fee structure deactivated');
      loadStructures();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const archiveItem = async (i) => {
    try {
      await apiDelete(`/fees/items/${i._id}`);
      toast.success('Item deactivated');
      loadItems();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const activeYear = years.find((y) => y._id === (modal?.type === 'structure-edit' ? modal.data.academicYear?._id || modal.data.academicYear : structForm.academicYear));
  const mismatches = validation.filter((v) => !v.matches && v.componentCount > 0);

  return (
    <div>
      <PageHeader
        title="Fees & Materials"
        subtitle="Configure fee structures per class/term and the material & uniform components that make up the totals."
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'structures' && (
        <>
          <Toolbar>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Select value={filters.academicYear} onChange={(e) => setFilters({ ...filters, academicYear: e.target.value, term: '' })}>
                <option value="">All years</option>
                {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
              </Select>
              <Select value={filters.term} onChange={(e) => setFilters({ ...filters, term: e.target.value })}>
                <option value="">All terms</option>
                {(activeYear?.terms || years.find((y) => y._id === filters.academicYear)?.terms || []).map((t) => (
                  <option key={t._id || t.name} value={t.name}>{t.name}</option>
                ))}
              </Select>
              <Select value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
              <Select value={filters.feeType} onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}>
                <option value="">All fee types</option>
                {['SCHOOL_FEES', 'MATERIALS', 'UNIFORM', 'OTHER'].map((t) => <option key={t} value={t}>{feeTypeLabel(t)}</option>)}
              </Select>
            </div>
            {can('fees:manageStructures') && (
              <Button
                onClick={() => {
                  setStructForm({
                    academicYear: filters.academicYear,
                    term: filters.term,
                    class: filters.class,
                    feeType: 'SCHOOL_FEES',
                    requiredAmount: '',
                  });
                  setModal({ type: 'structure-create' });
                }}
              >
                + Add Fee Structure
              </Button>
            )}
          </Toolbar>

          {loading ? (
            <Spinner />
          ) : (
            <Table
              columns={[
                { key: 'academicYear', label: 'Academic Year', render: (r) => r.academicYear?.name || '—' },
                { key: 'term', label: 'Term' },
                { key: 'class', label: 'Class', render: (r) => <span className="font-semibold">{r.class?.name}</span> },
                { key: 'feeType', label: 'Fee Type', render: (r) => <Badge className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400">{feeTypeLabel(r.feeType)}</Badge> },
                { key: 'requiredAmount', label: 'Required Amount', className: 'text-right font-semibold', render: (r) => money(r.requiredAmount) },
                { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
                {
                  key: 'actions',
                  label: '',
                  className: 'text-right',
                  render: (r) =>
                    can('fees:manageStructures') && (
                      <span className="flex justify-end gap-3 text-sm">
                        <button
                          onClick={() => {
                            setStructForm({
                              academicYear: r.academicYear?._id || r.academicYear,
                              term: r.term,
                              class: r.class?._id || r.class,
                              feeType: r.feeType,
                              requiredAmount: r.requiredAmount,
                            });
                            setModal({ type: 'structure-edit', data: r });
                          }}
                          className="font-medium text-green-700 dark:text-green-400 hover:underline"
                        >
                          Edit
                        </button>
                        {r.status === 'ACTIVE' && (
                          <button onClick={() => archiveStructure(r)} className="font-medium text-red-600 dark:text-red-400 hover:underline">Deactivate</button>
                        )}
                      </span>
                    ),
                },
              ]}
              rows={structures}
              emptyTitle="No fee structures"
              emptyMessage="Configure required fees per class, term and fee type."
            />
          )}
        </>
      )}

      {tab === 'items' && (
        <>
          <Toolbar>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Component prices. The system validates that the sum of components matches the class fee structure.
            </p>
            {can('fees:manageItems') && (
              <Button
                onClick={() => {
                  setItemForm({ category: 'MATERIAL', name: '', price: '', classes: [], order: items.length + 1 });
                  setModal({ type: 'item-create' });
                }}
              >
                + Add Item
              </Button>
            )}
          </Toolbar>

          <Table
            columns={[
              {
                key: 'category',
                label: 'Category',
                render: (r) => (
                  <Badge className={r.category === 'MATERIAL' ? 'bg-blue-50 text-blue-700 dark:text-blue-400' : 'bg-purple-50 text-purple-700'}>
                    {r.category}
                  </Badge>
                ),
              },
              { key: 'name', label: 'Item', render: (r) => <span className="font-medium text-gray-900 dark:text-gray-100">{r.name}</span> },
              { key: 'price', label: 'Price', className: 'text-right font-semibold', render: (r) => money(r.price) },
              {
                key: 'classes',
                label: 'Applies To',
                render: (r) => (!r.classes?.length ? <span className="text-gray-500 dark:text-gray-400">All classes</span> : r.classes.map((c) => c.name).join(', ')),
              },
              { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (r) =>
                  can('fees:manageItems') && (
                    <span className="flex justify-end gap-3 text-sm">
                      <button
                        onClick={() => {
                          setItemForm({
                            category: r.category,
                            name: r.name,
                            price: r.price,
                            classes: (r.classes || []).map((c) => c._id || c),
                            order: r.order,
                          });
                          setModal({ type: 'item-edit', data: r });
                        }}
                        className="font-medium text-green-700 dark:text-green-400 hover:underline"
                      >
                        Edit
                      </button>
                      {r.status === 'ACTIVE' && (
                        <button onClick={() => archiveItem(r)} className="font-medium text-red-600 dark:text-red-400 hover:underline">Deactivate</button>
                      )}
                    </span>
                  ),
              },
            ]}
            rows={items}
            emptyTitle="No components configured"
          />
        </>
      )}

      {tab === 'validate' && (
        <>
          {mismatches.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800">
              ⚠️ {mismatches.length} mismatch{mismatches.length === 1 ? '' : 'es'} found between component totals and required fee amounts.
            </div>
          )}
          <Table
            columns={[
              { key: 'class', label: 'Class', render: (r) => <span className="font-semibold">{r.class}</span> },
              { key: 'category', label: 'Category' },
              { key: 'componentCount', label: 'Components' },
              { key: 'componentTotal', label: 'Component Total', className: 'text-right', render: (r) => money(r.componentTotal) },
              { key: 'required', label: 'Required Amount', className: 'text-right', render: (r) => money(r.required) },
              {
                key: 'matches',
                label: 'Validation',
                render: (r) =>
                  r.componentCount === 0 ? (
                    <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">NO COMPONENTS</Badge>
                  ) : r.matches ? (
                    <Badge className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400">MATCHES</Badge>
                  ) : (
                    <Badge className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">MISMATCH</Badge>
                  ),
              },
            ]}
            rows={validation}
            emptyTitle="Nothing to validate"
          />
        </>
      )}

      {/* Fee structure modal */}
      <Modal
        open={modal?.type?.startsWith('structure')}
        onClose={() => setModal(null)}
        title={modal?.type === 'structure-edit' ? 'Edit Fee Structure' : 'Add Fee Structure'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={saveStructure} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={saveStructure} className="space-y-4">
          <Field label="Academic Year" required>
            <Select
              value={structForm.academicYear}
              onChange={(e) => setStructForm({ ...structForm, academicYear: e.target.value, term: '' })}
              disabled={modal?.type === 'structure-edit'}
            >
              <option value="">Select year</option>
              {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
            </Select>
          </Field>
          <Field label="Term" required>
            <Select value={structForm.term} onChange={(e) => setStructForm({ ...structForm, term: e.target.value })} disabled={modal?.type === 'structure-edit'}>
              <option value="">Select term</option>
              {(years.find((y) => y._id === structForm.academicYear)?.terms || []).map((t) => (
                <option key={t._id || t.name} value={t.name}>{t.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Class" required>
            <Select value={structForm.class} onChange={(e) => setStructForm({ ...structForm, class: e.target.value })} disabled={modal?.type === 'structure-edit'}>
              <option value="">Select class</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Fee Type" required>
            <Select value={structForm.feeType} onChange={(e) => setStructForm({ ...structForm, feeType: e.target.value })}>
              {['SCHOOL_FEES', 'MATERIALS', 'UNIFORM', 'OTHER'].map((t) => <option key={t} value={t}>{feeTypeLabel(t)}</option>)}
            </Select>
          </Field>
          <Field label="Required Amount (RWF)" required>
            <Input
              type="number"
              min="1"
              value={structForm.requiredAmount}
              onChange={(e) => setStructForm({ ...structForm, requiredAmount: e.target.value })}
              placeholder="e.g. 45000"
            />
          </Field>
        </form>
      </Modal>

      {/* Fee item modal */}
      <Modal
        open={modal?.type?.startsWith('item')}
        onClose={() => setModal(null)}
        title={modal?.type === 'item-edit' ? 'Edit Item' : 'Add Material / Uniform Item'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={saveItem} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={saveItem} className="space-y-4">
          <Field label="Category" required>
            <Select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
              <option value="MATERIAL">Material</option>
              <option value="UNIFORM">Uniform</option>
            </Select>
          </Field>
          <Field label="Item Name" required>
            <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Exercise Books" />
          </Field>
          <Field label="Price (RWF)" required>
            <Input type="number" min="1" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} placeholder="e.g. 1500" />
          </Field>
          <Field label="Applies To Classes" hint="Leave empty to apply to all classes">
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-2">
              {classes.map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={itemForm.classes.includes(c._id)}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        classes: e.target.checked ? [...itemForm.classes, c._id] : itemForm.classes.filter((x) => x !== c._id),
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 focus:ring-green-500"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
