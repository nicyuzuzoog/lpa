import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { get, post, put } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { money, formatDate, statusColor } from '../utils/format.js';
import { exportPdf, exportExcel, moneyFormat } from '../utils/export.js';
import { isPositive, isNonNegative, isIntInRange } from '../utils/validate.js';
import { PageHeader, Spinner, Badge, Toolbar, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Modal } from '../components/Modal.jsx';
import { Button, Field, Input, Select, Textarea } from '../components/Fields.jsx';

const EMPTY_ITEM = { name: '', gender: 'UNISEX', size: 'FREE', price: '', quantityReceived: 0, minimumStockLevel: 5, unitCost: 0, status: 'ACTIVE' };

function StudentPicker({ value, onChange }) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!query.trim()) return setOptions([]);
    const t = setTimeout(async () => {
      try {
        const d = await get('/students', { search: query, limit: 8 });
        setOptions(d.items || []);
      } catch (e) {
        toast.error(e.message);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, toast]);

  const pick = (s) => {
    setSelected(s);
    onChange(s._id);
    setOpen(false);
  };

  return (
    <div className="relative">
      {!selected ? (
        <>
          <Input placeholder="Search student…" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
          {open && options.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg">
              {options.map((s) => (
                <button key={s._id} type="button" onClick={() => pick(s)} className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-950/50">
                  <span className="font-medium">{s.firstName} {s.lastName}</span>
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{s.studentId}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm">
          <span className="font-medium text-gray-900 dark:text-gray-100">{selected.firstName} {selected.lastName}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{selected.studentId} · {selected.class?.name} · {selected.term}</span>
          <button type="button" onClick={() => { setSelected(null); onChange(''); setQuery(''); }} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Change</button>
        </div>
      )}
    </div>
  );
}

export default function Uniforms() {
  const { can } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('stock');
  const [items, setItems] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [issuances, setIssuances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [itemEdit, setItemEdit] = useState(null);
  const [stockTarget, setStockTarget] = useState(null);
  const [stockForm, setStockForm] = useState({ type: 'RECEIVED', quantity: '', reason: '' });
  const [issueStudent, setIssueStudent] = useState('');
  const [issueItems, setIssueItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/uniforms/items', { limit: 200 });
      setItems(d.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadDistribution = useCallback(async () => {
    try {
      const d = await get('/uniforms/distribution');
      setDistribution(d);
    } catch (e) {
      toast.error(e.message);
    }
  }, [toast]);

  const loadIssuances = useCallback(async () => {
    try {
      const d = await get('/uniforms/issuances', { limit: 100 });
      setIssuances(d.items || []);
    } catch (e) {
      toast.error(e.message);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === 'stock') loadStock();
    if (tab === 'distribution') loadDistribution();
    if (tab === 'issuances') loadIssuances();
  }, [tab, loadStock, loadDistribution, loadIssuances]);

  const openIssue = () => {
    setIssueStudent('');
    setIssueItems(items.map((i) => ({ _id: i._id, name: i.name, size: i.size, gender: i.gender, remaining: i.quantityRemaining, qty: 0 })));
    setModal('issue');
  };

  const saveIssue = async (e) => {
    e.preventDefault();
    if (!issueStudent) return toast.error('Select a student');
    const selected = issueItems.filter((i) => Number(i.qty) > 0);
    if (!selected.length) return toast.error('Select at least one item');
    const badQty = selected.find((i) => !isIntInRange(i.qty, 1));
    if (badQty) return toast.error(`Enter a whole number quantity for ${badQty.name}`);
    const over = selected.find((i) => Number(i.qty) > i.remaining);
    if (over) return toast.error(`Only ${over.remaining} in stock for ${over.name}`);
    setSaving(true);
    try {
      await post('/uniforms/issuances', {
        student: issueStudent,
        items: selected.map((i) => ({ uniformItem: i._id, quantity: Number(i.qty) })),
      });
      toast.success('Uniforms issued');
      setModal(null);
      loadStock();
      loadIssuances();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return toast.error('Item name is required');
    if (!itemForm.gender) return toast.error('Select a gender');
    if (!isPositive(itemForm.price)) return toast.error('Enter a valid price greater than 0');
    if (!isIntInRange(itemForm.price, 1)) return toast.error('Price must be a whole number');
    if (!isNonNegative(itemForm.minimumStockLevel) || !isNonNegative(itemForm.quantityReceived) || !isNonNegative(itemForm.unitCost)) return toast.error('Quantities and costs cannot be negative');
    if (!isIntInRange(itemForm.minimumStockLevel, 0) || !isIntInRange(itemForm.quantityReceived, 0)) return toast.error('Quantities must be whole numbers');
    setSaving(true);
    try {
      if (itemEdit) {
        await put(`/uniforms/items/${itemEdit._id}`, itemForm);
        toast.success('Item updated');
      } else {
        await post('/uniforms/items', itemForm);
        toast.success('Item added');
      }
      setModal(null);
      loadStock();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitStock = async (e) => {
    e.preventDefault();
    if (!isPositive(stockForm.quantity)) return toast.error('Enter a valid quantity greater than 0');
    if (!isIntInRange(stockForm.quantity, 1)) return toast.error('Quantity must be a whole number');
    if (stockForm.type !== 'RECEIVED' && Number(stockForm.quantity) > (stockTarget?.quantityRemaining || 0)) {
      return toast.error(`Only ${stockTarget?.quantityRemaining || 0} remaining`);
    }
    setSaving(true);
    try {
      await post(`/uniforms/items/${stockTarget._id}/transactions`, { type: stockForm.type, quantity: Number(stockForm.quantity), reason: stockForm.reason });
      toast.success(`Stock ${stockForm.type.toLowerCase()} recorded`);
      setModal(null);
      loadStock();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remaining = items.reduce((a, i) => a + i.quantityRemaining, 0);
  const issuedTotal = items.reduce((a, i) => a + i.quantityIssued, 0);
  const lowUniform = items.filter((i) => i.quantityRemaining <= i.minimumStockLevel).length;

  const distTotal = distribution?.totals;

  const doDistPdf = () => {
    exportPdf({
      title: 'Uniform Distribution Report',
      subtitle: 'Paid vs issued per uniform component',
      columns: [
        { key: 'name', label: 'Item' },
        { key: 'size', label: 'Size' },
        { key: 'gender', label: 'Gender' },
        { key: 'paidCount', label: 'Paid' },
        { key: 'issuedQuantity', label: 'Issued' },
        { key: 'notIssued', label: 'Not Issued' },
        { key: 'stockRemaining', label: 'Stock Remaining' },
        { key: 'paidValue', label: 'Paid Value', format: moneyFormat },
      ],
      rows: distribution?.rows || [],
      fileName: 'uniform-distribution',
    });
  };
  const doDistExcel = () => {
    exportExcel({
      columns: [
        { key: 'name', label: 'Item' },
        { key: 'size', label: 'Size' },
        { key: 'gender', label: 'Gender' },
        { key: 'paidCount', label: 'Paid' },
        { key: 'issuedQuantity', label: 'Issued' },
        { key: 'notIssued', label: 'Not Issued' },
        { key: 'stockRemaining', label: 'Stock Remaining' },
        { key: 'paidValue', label: 'Paid Value (RWF)', format: moneyFormat },
      ],
      rows: distribution?.rows || [],
      fileName: 'uniform-distribution',
      sheetName: 'Uniform Distribution',
    });
  };

  return (
    <div>
      <PageHeader
        title="Uniforms"
        subtitle="Uniform payments and physical distribution are tracked separately."
        actions={
          can('uniforms:issue') && (
            <Button onClick={openIssue} disabled={!items.length}>+ Issue Uniforms</Button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Uniforms Issued (all time)" value={issuedTotal} icon="bi-tag" tone="green" />
        <StatCard label="Remaining in Stock" value={remaining} icon="bi-box-seam" />
        <StatCard label="Low Stock Items" value={lowUniform} icon="bi-exclamation-triangle-fill" tone={lowUniform ? 'red' : 'green'} />
        <StatCard label="Uniform Components" value={items.length} icon="bi-clipboard-data" />
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 shadow-sm">
        {[['stock', 'Stock'], ['distribution', 'Distribution'], ['issuances', 'Student Issuances']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          <Toolbar>
            <p className="text-sm text-gray-500 dark:text-gray-400">Remaining = Received + Returned − Issued − Damaged.</p>
            {can('uniforms:manage') && (
              <Button onClick={() => { setItemEdit(null); setItemForm(EMPTY_ITEM); setModal('item-create'); }}>+ Add Uniform Item</Button>
            )}
          </Toolbar>
          {loading ? (
            <Spinner />
          ) : (
            <Table
              columns={[
                { key: 'name', label: 'Item', render: (r) => <Link to={`/app/uniforms/verify/placeholder`} className="pointer-events-none font-medium text-gray-900 dark:text-gray-100">{r.name}</Link> },
                { key: 'gender', label: 'Gender', render: (r) => <Badge className="bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300">{r.gender}</Badge> },
                { key: 'size', label: 'Size' },
                { key: 'price', label: 'Price', className: 'text-right', render: (r) => money(r.price) },
                { key: 'quantityReceived', label: 'Received' },
                { key: 'quantityIssued', label: 'Issued' },
                { key: 'quantityRemaining', label: 'Remaining', className: 'text-right font-semibold', render: (r) => <span className={r.quantityRemaining <= r.minimumStockLevel ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}>{r.quantityRemaining}</span> },
                {
                  key: 'statusNode',
                  label: 'Status',
                  render: (r) =>
                    r.quantityRemaining === 0 ? (
                      <Badge className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">OUT</Badge>
                    ) : r.quantityRemaining <= r.minimumStockLevel ? (
                      <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">LOW</Badge>
                    ) : (
                      <Badge className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400">OK</Badge>
                    ),
                },
                {
                  key: 'actions',
                  label: '',
                  className: 'text-right',
                  render: (r) =>
                    can('uniforms:manage') && (
                      <span className="flex justify-end gap-2 whitespace-nowrap text-sm">
                        <button onClick={() => { setStockTarget(r); setStockForm({ type: 'RECEIVED', quantity: '', reason: '' }); setModal('stock'); }} className="font-medium text-green-700 dark:text-green-400 hover:underline">Receive</button>
                        <button onClick={() => { setStockTarget(r); setStockForm({ type: 'DAMAGED', quantity: '', reason: '' }); setModal('stock'); }} className="font-medium text-amber-600 hover:underline">Damage</button>
                        <button
                          onClick={() => {
                            setItemEdit(r);
                            setItemForm({ name: r.name, gender: r.gender, size: r.size, price: r.price, quantityReceived: r.quantityReceived, minimumStockLevel: r.minimumStockLevel, unitCost: r.unitCost, status: r.status });
                            setModal('item-edit');
                          }}
                          className="font-medium text-gray-600 dark:text-gray-300 hover:underline"
                        >
                          Edit
                        </button>
                      </span>
                    ),
                },
              ]}
              rows={items}
              emptyTitle="No uniform items configured"
              emptyMessage="Add uniform components (e.g. School Shirt, Sports Shorts, Socks)."
            />
          )}
        </>
      )}

      {tab === 'distribution' && (
        <>
          <Toolbar>
            <p className="text-sm text-gray-500 dark:text-gray-400">Paid records come from uniform payments; issued records come from physical distribution.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={doDistPdf}>PDF</Button>
              <Button variant="secondary" onClick={doDistExcel}>Excel</Button>
            </div>
          </Toolbar>

          {!distribution ? (
            <Spinner />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Table
                  columns={[
                    { key: 'name', label: 'Item', render: (r) => <span className="font-medium text-gray-900 dark:text-gray-100">{r.name}</span> },
                    { key: 'size', label: 'Size' },
                    { key: 'gender', label: 'Gender' },
                    { key: 'paidCount', label: 'Paid', className: 'text-right font-semibold text-green-700 dark:text-green-400', render: (r) => r.paidCount },
                    { key: 'issuedQuantity', label: 'Issued', className: 'text-right' },
                    { key: 'notIssued', label: 'Not Issued', className: 'text-right', render: (r) => <span className={r.notIssued > 0 ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}>{r.notIssued}</span> },
                    { key: 'stockRemaining', label: 'Stock Left', className: 'text-right' },
                  ]}
                  rows={distribution.rows || []}
                  emptyTitle="No distribution data yet"
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Summary</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Paid</dt><dd className="font-bold text-green-700 dark:text-green-400">{distTotal?.paid}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Issued</dt><dd className="font-semibold">{distTotal?.issued}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Not Issued</dt><dd className="font-semibold text-amber-700 dark:text-amber-400">{distTotal?.notIssued}</dd></div>
                    <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2"><dt className="text-gray-500 dark:text-gray-400">Stock Remaining</dt><dd className="font-semibold">{distTotal?.stockRemaining}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Paid Value</dt><dd className="font-semibold">{money(distTotal?.paidValue)}</dd></div>
                  </dl>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Stock by Size</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(distribution.bySize || {}).map(([k, v]) => (
                      <span key={k} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-700 dark:text-gray-200"><b>{k}</b> · {v}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Stock by Gender</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(distribution.byGender || {}).map(([k, v]) => (
                      <span key={k} className="rounded-full bg-green-50 dark:bg-green-950/40 px-3 py-1 text-xs text-green-700 dark:text-green-400"><b>{k}</b> · {v}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'issuances' && (
        <Table
          columns={[
            {
              key: 'student',
              label: 'Student',
              render: (r) => (
                <Link to={`/app/students/${r.student?._id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-green-700">
                  {r.student?.firstName} {r.student?.lastName}
                  <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({r.student?.studentId})</span>
                </Link>
              ),
            },
            {
              key: 'items',
              label: 'Items',
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {(r.items || []).map((i, idx) => (
                    <Badge key={idx} className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400">{i.name} · {i.size} ×{i.quantity}</Badge>
                  ))}
                </div>
              ),
            },
            { key: 'term', label: 'Year / Term', render: (r) => `${r.academicYear?.name || '—'} · ${r.term}` },
            { key: 'status', label: 'Status', render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
            { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
            { key: 'issuedBy', label: 'Issued By', render: (r) => r.issuedBy?.fullName || '—' },
          ]}
          rows={issuances}
          emptyTitle="No uniforms issued yet"
        />
      )}

      {/* Issue uniforms */}
      <Modal
        open={modal === 'issue'}
        onClose={() => setModal(null)}
        title="Issue Uniforms to Student"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={saveIssue} disabled={saving}>{saving ? 'Issuing…' : 'Issue Uniforms'}</Button>
          </>
        }
      >
        <form onSubmit={saveIssue} className="space-y-4">
          <Field label="Student" required>
            <StudentPicker value={issueStudent} onChange={setIssueStudent} />
          </Field>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Items to distribute</p>
          <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-2">
            {issueItems.map((i) => (
              <div key={i._id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-800 dark:text-gray-100">{i.name} <span className="text-xs text-gray-400 dark:text-gray-500">({i.size} · {i.gender})</span></p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Stock: {i.remaining}</p>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={i.remaining}
                  className="!w-20 text-right"
                  value={i.qty}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > i.remaining) toast.error(`Only ${i.remaining} in stock for ${i.name}`);
                    setIssueItems(issueItems.map((x) => (x._id === i._id ? { ...x, qty: e.target.value === '' ? 0 : val } : x)));
                  }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </form>
      </Modal>

      {/* Add / edit uniform item */}
      <Modal
        open={modal === 'item-create' || modal === 'item-edit'}
        onClose={() => setModal(null)}
        title={modal === 'item-edit' ? `Edit ${itemEdit?.name}` : 'Add Uniform Item'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={saveItem} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form onSubmit={saveItem} className="space-y-4">
          <Field label="Item Name" required>
            <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. School Shorts - Boys" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Gender">
              <Select value={itemForm.gender} onChange={(e) => setItemForm({ ...itemForm, gender: e.target.value })}>
                <option value="BOYS">Boys</option>
                <option value="GIRLS">Girls</option>
                <option value="UNISEX">Unisex</option>
              </Select>
            </Field>
            <Field label="Size">
              <Input value={itemForm.size} onChange={(e) => setItemForm({ ...itemForm, size: e.target.value })} placeholder="e.g. 28 or FREE" />
            </Field>
            <Field label="Price (RWF)" required>
              <Input type="number" min="1" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} placeholder="e.g. 3500" />
            </Field>
            <Field label="Minimum Stock Level">
              <Input type="number" min="0" value={itemForm.minimumStockLevel} onChange={(e) => setItemForm({ ...itemForm, minimumStockLevel: Number(e.target.value) })} placeholder="e.g. 5" />
            </Field>
            <Field label="Opening Quantity Received" hint="Adds an opening stock transaction">
              <Input type="number" min="0" value={itemForm.quantityReceived} onChange={(e) => setItemForm({ ...itemForm, quantityReceived: Number(e.target.value) })} placeholder="e.g. 100" />
            </Field>
            <Field label="Unit Cost (RWF)">
              <Input type="number" min="0" value={itemForm.unitCost} onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })} placeholder="e.g. 2000" />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Stock movement */}
      <Modal
        open={modal === 'stock'}
        onClose={() => setModal(null)}
        title={`${stockForm.type === 'RECEIVED' ? 'Receive' : stockForm.type} — ${stockTarget?.name} (${stockTarget?.size})`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={submitStock} disabled={saving}>{saving ? 'Saving…' : 'Submit'}</Button>
          </>
        }
      >
        <form onSubmit={submitStock} className="space-y-4">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 px-3 py-2 text-sm">
            Remaining: <span className="font-bold">{stockTarget?.quantityRemaining}</span> · Received: {stockTarget?.quantityReceived}
          </div>
          <Field label="Quantity" required>
            <Input type="number" min="1" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} placeholder="e.g. 50" />
          </Field>
          <Field label="Reason">
            <Textarea rows={2} value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} placeholder="e.g. New batch received" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}