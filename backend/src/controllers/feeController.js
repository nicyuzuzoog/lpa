import FeeStructure, { FEE_TYPES } from '../models/FeeStructure.js';
import FeeItem from '../models/FeeItem.js';
import SchoolClass from '../models/SchoolClass.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { recordAudit, diffObjects } from '../services/auditService.js';

export const listStructures = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.term) filter.term = req.query.term;
  if (req.query.class) filter.class = req.query.class;
  if (req.query.feeType) filter.feeType = req.query.feeType;
  if (req.query.status) filter.status = req.query.status;

  const items = await FeeStructure.find(filter)
    .populate('academicYear', 'name')
    .populate('class', 'name level')
    .sort({ term: 1, feeType: 1 });
  res.json({ success: true, items });
});

export const createStructure = asyncHandler(async (req, res) => {
  const { academicYear, term, class: classId, feeType, requiredAmount, status } = req.body;
  if (!academicYear || !term || !classId || !feeType || requiredAmount === undefined) {
    throw new ApiError(400, 'Academic year, term, class, fee type and amount are required');
  }
  if (!FEE_TYPES.includes(feeType)) throw new ApiError(400, 'Invalid fee type');
  if (Number(requiredAmount) < 0) throw new ApiError(400, 'Amount cannot be negative');

  const dup = await FeeStructure.findOne({ academicYear, term, class: classId, feeType });
  if (dup) throw new ApiError(409, 'A fee structure already exists for this class, term and fee type');

  const doc = await FeeStructure.create({ academicYear, term, class: classId, feeType, requiredAmount, status });
  await recordAudit({ user: req.user, action: 'CREATE', module: 'FEES', recordId: doc._id, recordLabel: feeType, newValue: doc.toObject() });
  res.status(201).json({ success: true, item: await doc.populate([{ path: 'class', select: 'name' }, { path: 'academicYear', select: 'name' }]) });
});

export const updateStructure = asyncHandler(async (req, res) => {
  const doc = await FeeStructure.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Fee structure not found');
  const before = doc.toObject();

  const { requiredAmount, status, term } = req.body;
  if (requiredAmount !== undefined) {
    if (Number(requiredAmount) < 0) throw new ApiError(400, 'Amount cannot be negative');
    doc.requiredAmount = Number(requiredAmount);
  }
  if (status) doc.status = status;
  if (term) doc.term = term;

  await doc.save();
  const changes = diffObjects(before, doc.toObject(), ['requiredAmount', 'status', 'term']);
  await recordAudit({
    user: req.user,
    action: 'UPDATE',
    module: 'FEES',
    recordId: doc._id,
    recordLabel: `${doc.feeType}`,
    oldValue: changes ? Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.from])) : null,
    newValue: changes,
    reason: req.body.reason || '',
  });
  res.json({ success: true, item: await doc.populate([{ path: 'class', select: 'name' }, { path: 'academicYear', select: 'name' }]) });
});

export const archiveStructure = asyncHandler(async (req, res) => {
  const doc = await FeeStructure.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Fee structure not found');
  doc.status = 'INACTIVE';
  await doc.save();
  await recordAudit({ user: req.user, action: 'ARCHIVE', module: 'FEES', recordId: doc._id, recordLabel: doc.feeType });
  res.json({ success: true, item: doc });
});

export const listItems = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  const items = await FeeItem.find(filter).populate('classes', 'name').sort({ category: 1, order: 1, createdAt: 1 });
  res.json({ success: true, items });
});

export const createItem = asyncHandler(async (req, res) => {
  const { category, name, price, classes, status, order } = req.body;
  if (!category || !name || price === undefined) throw new ApiError(400, 'Category, name and price are required');
  if (!['MATERIAL', 'UNIFORM'].includes(category)) throw new ApiError(400, 'Invalid category');
  if (Number(price) < 0) throw new ApiError(400, 'Price cannot be negative');

  const doc = await FeeItem.create({ category, name, price, classes: classes || [], status, order: order || 0 });
  await recordAudit({ user: req.user, action: 'CREATE', module: 'FEE_ITEMS', recordId: doc._id, recordLabel: doc.name, newValue: doc.toObject() });
  res.status(201).json({ success: true, item: await doc.populate('classes', 'name') });
});

export const updateItem = asyncHandler(async (req, res) => {
  const doc = await FeeItem.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Fee item not found');
  const before = doc.toObject();

  const { name, price, classes, status, order } = req.body;
  if (name) doc.name = name;
  if (price !== undefined) {
    if (Number(price) < 0) throw new ApiError(400, 'Price cannot be negative');
    doc.price = Number(price);
  }
  if (classes) doc.classes = classes;
  if (status) doc.status = status;
  if (order !== undefined) doc.order = order;

  await doc.save();
  const changes = diffObjects(before, doc.toObject(), ['name', 'price', 'classes', 'status', 'order']);
  await recordAudit({
    user: req.user,
    action: 'UPDATE',
    module: 'FEE_ITEMS',
    recordId: doc._id,
    recordLabel: doc.name,
    oldValue: changes ? Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.from])) : null,
    newValue: changes,
    reason: req.body.reason || '',
  });
  res.json({ success: true, item: await doc.populate('classes', 'name') });
});

export const archiveItem = asyncHandler(async (req, res) => {
  const doc = await FeeItem.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Fee item not found');
  doc.status = 'INACTIVE';
  await doc.save();
  await recordAudit({ user: req.user, action: 'ARCHIVE', module: 'FEE_ITEMS', recordId: doc._id, recordLabel: doc.name });
  res.json({ success: true, item: doc });
});

// Validates that configured MATERIAL / UNIFORM component totals match the class fee structure.
export const validateTotals = asyncHandler(async (req, res) => {
  const classes = await SchoolClass.find({ status: 'ACTIVE' }).sort({ order: 1 });
  const structures = await FeeStructure.find({ status: 'ACTIVE', feeType: { $in: ['MATERIALS', 'UNIFORM'] } }).populate('class', 'name');
  const items = await FeeItem.find({ status: 'ACTIVE' });

  const results = [];
  for (const cls of classes) {
    for (const [category, feeType] of [['MATERIAL', 'MATERIALS'], ['UNIFORM', 'UNIFORM']]) {
      const applicable = items.filter(
        (i) => i.category === category && (!i.classes.length || i.classes.some((c) => String(c) === String(cls._id)))
      );
      const componentTotal = applicable.reduce((a, i) => a + i.price, 0);
      const structure = structures.find((s) => String(s.class?._id || s.class) === String(cls._id) && s.feeType === feeType);
      const required = structure?.requiredAmount || 0;
      results.push({
        class: cls.name,
        category,
        feeType,
        componentTotal,
        required,
        matches: componentTotal === required,
        componentCount: applicable.length,
      });
    }
  }

  const mismatches = results.filter((r) => !r.matches && r.componentCount > 0);
  res.json({ success: true, items: results, mismatches });
});
