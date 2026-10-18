import InventoryItem from '../models/InventoryItem.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination, nextSequence, pad } from '../utils/sequence.js';
import { recordAudit, diffObjects } from '../services/auditService.js';
import { notify } from '../services/notificationService.js';

const INCREASING = ['RECEIVED', 'RETURNED'];
const DECREASING = ['ISSUED', 'DAMAGED', 'LOST'];

async function applyTransaction({ item, type, quantity, newStock, date, reason = '', reference = '' }, user) {
  const before = item.currentStock;
  let qty = Number(quantity) || 0;

  if (type === 'ADJUSTMENT') {
    if (newStock === undefined || newStock === null) throw new ApiError(400, 'New stock quantity is required for an adjustment');
    if (Number(newStock) < 0) throw new ApiError(400, 'Stock cannot be negative');
    qty = Math.abs(Number(newStock) - before);
    item.currentStock = Number(newStock);
  } else if (INCREASING.includes(type)) {
    if (qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
    item.currentStock = before + qty;
  } else if (DECREASING.includes(type)) {
    if (qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');
    if (qty > before) throw new ApiError(400, `Insufficient stock. Available: ${before} ${item.unit}`);
    item.currentStock = before - qty;
  } else {
    throw new ApiError(400, 'Invalid transaction type');
  }

  item.lastMovementAt = date || new Date();
  await item.save();

  const tx = await InventoryTransaction.create({
    item: item._id,
    type,
    quantity: qty,
    balanceBefore: before,
    balanceAfter: item.currentStock,
    date: date || new Date(),
    reason,
    reference,
    performedBy: user._id,
  });

  if (item.currentStock <= item.minimumStockLevel && item.minimumStockLevel > 0) {
    await notify({
      title: 'Low stock alert',
      message: `${item.name} is low: ${item.currentStock} ${item.unit} remaining (minimum ${item.minimumStockLevel})`,
      type: 'INVENTORY',
      relatedRecord: { module: 'inventory', id: String(item._id) },
      createdBy: user._id,
      audienceRoles: ['SUPER_ADMIN', 'ACCOUNTANT'],
    });
  }

  return tx;
}

export const listItems = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 50);
  const filter = {};
  if (req.query.search) filter.name = new RegExp(String(req.query.search).trim(), 'i');
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.stockStatus === 'LOW') filter.$expr = { $lte: ['$currentStock', '$minimumStockLevel'] };
  if (req.query.stockStatus === 'OUT') filter.currentStock = 0;
  if (req.query.stockStatus === 'OK') filter.$expr = { $gt: ['$currentStock', '$minimumStockLevel'] };

  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    InventoryItem.countDocuments(filter),
  ]);

  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

export const lowStock = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find({
    status: 'ACTIVE',
    $expr: { $lte: ['$currentStock', '$minimumStockLevel'] },
  }).sort({ currentStock: 1 });
  res.json({ success: true, items });
});

export const createItem = asyncHandler(async (req, res) => {
  const { name, category, unit, openingStock, minimumStockLevel, unitCost, status } = req.body;
  if (!name || !unit) throw new ApiError(400, 'Item name and unit are required');

  const dup = await InventoryItem.findOne({ name: name.trim() });
  if (dup) throw new ApiError(409, 'An inventory item with this name already exists');

  const doc = await InventoryItem.create({
    name,
    category: category || 'OTHER',
    unit,
    openingStock: Number(openingStock) || 0,
    currentStock: Number(openingStock) || 0,
    minimumStockLevel: Number(minimumStockLevel) || 0,
    unitCost: Number(unitCost) || 0,
    status,
  });

  if (doc.openingStock > 0) {
    await InventoryTransaction.create({
      item: doc._id,
      type: 'ADJUSTMENT',
      quantity: doc.openingStock,
      balanceBefore: 0,
      balanceAfter: doc.openingStock,
      reason: 'Opening stock',
      performedBy: req.user._id,
    });
  }

  await recordAudit({ user: req.user, action: 'CREATE', module: 'INVENTORY', recordId: doc._id, recordLabel: doc.name, newValue: doc.toObject() });
  res.status(201).json({ success: true, item: doc });
});

export const updateItem = asyncHandler(async (req, res) => {
  const doc = await InventoryItem.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Inventory item not found');
  const before = doc.toObject();

  const allowed = ['name', 'category', 'unit', 'minimumStockLevel', 'unitCost', 'status'];
  for (const key of allowed) if (req.body[key] !== undefined) doc[key] = req.body[key];

  await doc.save();
  const changes = diffObjects(before, doc.toObject(), allowed);
  if (changes) {
    await recordAudit({
      user: req.user,
      action: 'UPDATE',
      module: 'INVENTORY',
      recordId: doc._id,
      recordLabel: doc.name,
      oldValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.from])),
      newValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.to])),
      reason: req.body.reason || '',
    });
  }
  res.json({ success: true, item: doc });
});

export const recordTransaction = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Inventory item not found');

  const { type, quantity, newStock, date, reason, reference } = req.body;
  const tx = await applyTransaction({ item, type, quantity, newStock, date, reason, reference }, req.user);

  await recordAudit({
    user: req.user,
    action: type,
    module: 'INVENTORY',
    recordId: item._id,
    recordLabel: `${item.name} (${tx.quantity} ${item.unit})`,
    oldValue: { stock: tx.balanceBefore },
    newValue: { stock: tx.balanceAfter },
    reason: reason || '',
  });

  await notify({
    title: `Inventory ${type.toLowerCase()}`,
    message: `${item.name}: ${type.toLowerCase()} ${tx.quantity} ${item.unit} (stock ${tx.balanceBefore} → ${tx.balanceAfter})`,
    type: 'INVENTORY',
    relatedRecord: { module: 'inventory', id: String(item._id) },
    createdBy: req.user._id,
    audienceRoles: ['SUPER_ADMIN', 'ACCOUNTANT'],
  });

  res.status(201).json({ success: true, item, transaction: tx });
});

export const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 30);
  const filter = {};
  if (req.query.item) filter.item = req.query.item;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.date = {};
    if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) {
      const to = new Date(req.query.dateTo);
      to.setHours(23, 59, 59, 999);
      filter.date.$lte = to;
    }
  }

  const [items, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .populate({ path: 'item', select: 'name unit category' })
      .populate('performedBy', 'fullName username role')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InventoryTransaction.countDocuments(filter),
  ]);

  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});
