import { useEffect, useState, useCallback } from 'react';
import { get, post, put } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { money, formatDate, statusColor } from '../utils/format.js';
import { isPositive, isNonNegative, isIntInRange, isFutureDate } from '../utils/validate.js';
import { PageHeader, Spinner, Badge, Toolbar, StatCard } from '../components/ui.jsx';
import Table from '../components/Table.jsx';
import { Modal, ConfirmDialog } from '../components/Modal.jsx';
import { Button, Field, Input, Select, Textarea } from '../components/Fields.jsx';

const CATEGORIES = ['FOOD', 'SCHOOL_BOOKS', 'STATIONERY', 'SPORTS_EQUIPMENT', 'CLEANING', 'OTHER'];

const EMPTY_ITEM = { name: '', category: 'OTHER', unit: '', openingStock: 0, minimumStockLevel: 0, unitCost: 0, status: 'ACTIVE' };
const EMPTY_STOCK = { type: 'RECEIVED', quantity: '', date: new Date().toISOString().slice(0, 10), reason: '', reference: '' };

export default function Inventory() {
  const { can } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('items');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '', stockStatus: '' });
  const [modal, setModal] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [stockForm, setStockForm] = useState({ ...EMPTY_STOCK });
  const [adjustForm, setAdjustForm] = useState({ type: 'ADJUSTMENT', newStock: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get('/inventory/items', { ...filters, page, limit: 30 });
      setItems(d.items);
      setTotal(d.total);
      setPages(d.pages);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, toast]);

  const loadTx = useCallback(async () => {
    try {
      const d = await get('/inventory/transactions', { limit: 50 });
      setTransactions(d.items || []);
    } catch (e) {
      toast.error(e.message);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === 'items') loadItems();
    else loadTx();
  }, [tab, loadItems, loadTx]);

  const saveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim() || !itemForm.unit.trim()) return toast.error('Item name and unit are required');
    if (!isNonNegative(itemForm.openingStock) || !isNonNegative(itemForm.minimumStockLevel) || !isNonNegative(itemForm.unitCost)) return toast.error('Stock quantities and unit cost cannot be negative');
    if (!isIntInRange(itemForm.openingStock, 0) || !isIntInRange(itemForm.minimumStockLevel, 0)) return toast.error('Stock quantities must be whole numbers');
    setSaving(true);
    try {
      if (modal === 'edit') {
        await put(`/inventory/items/${itemEdit?._id}`, itemForm);
        toast.success('Item updated');
      } else {
        await post('/inventory/items', itemForm);
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

  const submitStock = async (e) => {
    e.preventDefault();
    if (!isPositive(stockForm.quantity)) return toast.error('Enter a valid quantity greater than 0');
    if (!isIntInRange(stockForm.quantity, 1)) return toast.error('Quantity must be a whole number');
    if (['ISSUED', 'DAMAGED', 'LOST'].includes(stockForm.type) && Number(stockForm.quantity) > (stockTarget?.currentStock || 0)) {
      return toast.error(`Only ${stockTarget?.currentStock || 0} ${stockTarget?.unit || 'units'} in stock`);
    }
    if (isFutureDate(stockForm.date)) return toast.error('Transaction date cannot be in the future');
    setSaving(true);
    try {
      await post(`/inventory/items/${stockTarget._id}/transactions`, {
        type: stockForm.type,
        quantity: Number(stockForm.quantity),
        date: stockForm.date || undefined,
        reason: stockForm.reason,
        reference: stockForm.reference,
      });
      toast.success(`Stock ${stockForm.type.toLowerCase()} recorded`);
      setModal(null);
      loadItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    if (!isIntInRange(adjustForm.newStock, 0)) return toast.error('Enter a valid new stock quantity (whole number, 0 or more)');
    if (!adjustForm.reason || !adjustForm.reason.trim()) return toast.error('A reason is required for a stock adjustment');
    setSaving(true);
    try {
      await post(`/inventory/items/${stockTarget._id}/transactions`, {
        type: 'ADJUSTMENT',
        newStock: Number(adjustForm.newStock),
        reason: adjustForm.reason.trim(),
      });
      toast.success('Stock adjusted');
      setModal(null);
      loadItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const [itemEdit, setItemEdit] = useState(null);
  const [stockTarget, setStockTarget] = useState(null);

  const lowCount = items.filter((i) => i.currentStock <= i.minimumStockLevel).length;
  const valuation = items.reduce((a, i) => a + i.currentStock * (i.unitCost || 0), 0);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Every stock movement is recorded. Current stock cannot be changed manually — use adjustments."
        actions={can('inventory:manage') && (
          <Button
            onClick={() => {
              setItemEdit(null);
              setItemForm(EMPTY_ITEM);
              setModal('create');
            }}
          >
            + Add Item
          </Button>
        )}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Items" value={total} icon="bi-box-seam" />
        <StatCard label="Low / Out of Stock" value={lowCount} icon="bi-exclamation-triangle-fill" tone={lowCount ? 'red' : 'green'} />
        <StatCard label="Stock Value" value={money(valuation)} icon="bi-gem" />
        <StatCard label="Transactions" value={transactions.length} icon="bi-arrow-repeat" />
      </div>

      <div className="mb-4 flex gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
        {[['items', 'Items'], ['transactions', 'Transactions']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <>
          <Toolbar>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Input placeholder="Search item…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="max-w-[200px]" />
              <Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </Select>
              <Select value={filters.stockStatus} onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}>
                <option value="">All stock levels</option>
                <option value="LOW">In stock (low)</option>
                <option value="OK">Above minimum</option>
                <option value="OUT">Out of stock</option>
              </Select>
            </div>
          </Toolbar>

          {loading ? (
            <Spinner />
          ) : (
            <Table
              columns={[
                { key: 'name', label: 'Item', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
                { key: 'category', label: 'Category', render: (r) => r.category.replace('_', ' ') },
                { key: 'unit', label: 'Unit' },
                { key: 'openingStock', label: 'Opening' },
                { key: 'currentStock', label: 'Current', className: 'text-right font-semibold', render: (r) => <span className={r.currentStock <= r.minimumStockLevel ? 'text-red-600' : 'text-green-700'}>{r.currentStock}</span> },
                { key: 'minimumStockLevel', label: 'Min Level' },
                {
                  key: 'stockStatus',
                  label: 'Status',
                  render: (r) =>
                    r.currentStock === 0 ? (
                      <Badge className="bg-red-100 text-red-700">OUT OF STOCK</Badge>
                    ) : r.currentStock <= r.minimumStockLevel ? (
                      <Badge className="bg-amber-100 text-amber-700">LOW STOCK</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700">OK</Badge>
                    ),
                },
                {
                  key: 'actions',
                  label: '',
                  className: 'text-right',
                  render: (r) =>
                    can('inventory:manage') && (
                      <span className="flex justify-end gap-2 whitespace-nowrap text-sm">
                        <button onClick={() => { setStockTarget(r); setStockForm({ ...EMPTY_STOCK, type: 'RECEIVED' }); setModal('receive'); }} className="font-medium text-green-700 hover:underline">Receive</button>
                        <button onClick={() => { setStockTarget(r); setStockForm({ ...EMPTY_STOCK, type: 'ISSUED' }); setModal('issue'); }} className="font-medium text-green-700 hover:underline">Issue</button>
                        <button onClick={() => { setStockTarget(r); setStockForm({ ...EMPTY_STOCK, type: 'DAMAGED' }); setModal('issue'); }} className="font-medium text-amber-600 hover:underline">Damage</button>
                        <button onClick={() => { setStockTarget(r); setAdjustForm({ ...adjustForm, newStock: r.currentStock }); setModal('adjust'); }} className="font-medium text-gray-600 hover:underline">Adjust</button>
                        <button onClick={() => { setItemEdit(r); setItemForm({ name: r.name, category: r.category, unit: r.unit, openingStock: r.openingStock, minimumStockLevel: r.minimumStockLevel, unitCost: r.unitCost, status: r.status }); setModal('edit'); }} className="font-medium text-gray-600 hover:underline">Edit</button>
                      </span>
                    ),
                },
              ]}
              rows={items}
              emptyTitle="No inventory items found"
              page={page}
              pages={pages}
              total={total}
              onPage={setPage}
            />
          )}
        </>
      )}

      {tab === 'transactions' && (
        <Table
          columns={[
            { key: 'item', label: 'Item', render: (r) => <span className="font-medium text-gray-900">{r.item?.name}</span> },
            { key: 'type', label: 'Type', render: (r) => <Badge className={statusColor(r.type)}>{r.type}</Badge> },
            { key: 'quantity', label: 'Qty', className: 'text-right', render: (r) => <span className="font-semibold">{r.quantity} {r.item?.unit}</span> },
            { key: 'balanceBefore', label: 'Before' },
            { key: 'balanceAfter', label: 'After', className: 'font-semibold' },
            { key: 'reason', label: 'Reason', render: (r) => r.reason || '—' },
            { key: 'reference', label: 'Reference', render: (r) => r.reference || '—' },
            { key: 'date', label: 'Date', render: (r) => formatDate(r.date, true) },
            { key: 'performedBy', label: 'By', render: (r) => r.performedBy?.fullName || '—' },
          ]}
          rows={transactions}
          emptyTitle="No transactions yet"
        />
      )}

      {/* Create / edit item */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add Inventory Item' : `Edit ${itemEdit?.name || ''}`}
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
            <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Bag of rice" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Category">
              <Select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Unit" required>
              <Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="e.g. Bags" />
            </Field>
            {modal === 'create' && (
              <Field label="Opening Stock">
                <Input type="number" min="0" value={itemForm.openingStock} onChange={(e) => setItemForm({ ...itemForm, openingStock: Number(e.target.value) })} placeholder="e.g. 50" />
              </Field>
            )}
            <Field label="Minimum Stock Level">
              <Input type="number" min="0" value={itemForm.minimumStockLevel} onChange={(e) => setItemForm({ ...itemForm, minimumStockLevel: Number(e.target.value) })} placeholder="e.g. 10" />
            </Field>
            <Field label="Unit Cost (RWF)">
              <Input type="number" min="0" value={itemForm.unitCost} onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })} placeholder="e.g. 1200" />
            </Field>
          </div>
          <Field label="Status">
            <Select value={itemForm.status} onChange={(e) => setItemForm({ ...itemForm, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
        </form>
      </Modal>

      {/* Receive / issue / damage */}
      <Modal
        open={modal === 'receive' || modal === 'issue'}
        onClose={() => setModal(null)}
        title={
          modal === 'receive'
            ? `Receive Stock — ${stockTarget?.name}`
            : modal === 'issue'
            ? `Issue / Adjust — ${stockTarget?.name}`
            : ''
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={submitStock} disabled={saving}>{saving ? 'Saving…' : 'Submit'}</Button>
          </>
        }
      >
        <form onSubmit={submitStock} className="space-y-4">
          {stockTarget && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
              Current stock: <span className="font-bold text-gray-900">{stockTarget.currentStock}</span> {stockTarget.unit}
              {stockTarget.minimumStockLevel > 0 && <span className="text-gray-500"> · Min level: {stockTarget.minimumStockLevel}</span>}
            </div>
          )}
          <Field label="Transaction Type" required>
            <Select
              value={stockForm.type}
              onChange={(e) => setStockForm({ ...stockForm, type: e.target.value })}
              disabled={modal === 'receive'}
            >
              <option value="RECEIVED">Received (+)</option>
              <option value="ISSUED">Issued (−)</option>
              <option value="RETURNED">Returned (+)</option>
              <option value="DAMAGED">Damaged (−)</option>
              <option value="LOST">Lost (−)</option>
            </Select>
          </Field>
          <Field label={`Quantity (${stockTarget?.unit || 'units'})`} required>
            <Input type="number" min="1" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} placeholder="e.g. 20" />
          </Field>
          <Field label="Date">
            <Input type="date" value={stockForm.date} onChange={(e) => setStockForm({ ...stockForm, date: e.target.value })} />
          </Field>
          <Field label="Reason">
            <Textarea rows={2} value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} placeholder="e.g. Delivered by supplier" />
          </Field>
          {modal === 'issue' && (
            <Field label="Reference (issued to)">
              <Input value={stockForm.reference} onChange={(e) => setStockForm({ ...stockForm, reference: e.target.value })} placeholder="e.g. Who / where" />
            </Field>
          )}
        </form>
      </Modal>

      {/* Adjustment */}
      <Modal
        open={modal === 'adjust'}
        onClose={() => setModal(null)}
        title={`Adjust Stock — ${stockTarget?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={submitAdjust} disabled={saving}>{saving ? 'Saving…' : 'Apply Adjustment'}</Button>
          </>
        }
      >
        <form onSubmit={submitAdjust} className="space-y-4">
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This records an ADJUSTMENT transaction for the audit trail. Current: <span className="font-bold">{stockTarget?.currentStock}</span> {stockTarget?.unit}.
          </div>
          <Field label="New Stock Quantity" required>
            <Input type="number" min="0" value={adjustForm.newStock} onChange={(e) => setAdjustForm({ ...adjustForm, newStock: e.target.value })} placeholder="e.g. 25" />
          </Field>
          <Field label="Reason" required>
            <Textarea rows={2} value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="e.g. Stock count correction" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}