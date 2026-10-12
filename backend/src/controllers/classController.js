import SchoolClass from '../models/SchoolClass.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { recordAudit } from '../services/auditService.js';

export const listClasses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const items = await SchoolClass.find(filter).sort({ order: 1, name: 1 });
  res.json({ success: true, items });
});

export const createClass = asyncHandler(async (req, res) => {
  const { name, level, order, status } = req.body;
  if (!name) throw new ApiError(400, 'Class name is required');
  const exists = await SchoolClass.findOne({ name: name.trim() });
  if (exists) throw new ApiError(409, 'This class already exists');

  const doc = await SchoolClass.create({ name, level, order, status });
  await recordAudit({ user: req.user, action: 'CREATE', module: 'CLASSES', recordId: doc._id, recordLabel: doc.name, newValue: doc.toObject() });
  res.status(201).json({ success: true, item: doc });
});

export const updateClass = asyncHandler(async (req, res) => {
  const doc = await SchoolClass.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Class not found');
  const before = doc.toObject();

  const { name, level, order, status } = req.body;
  if (name) doc.name = name;
  if (level) doc.level = level;
  if (order !== undefined) doc.order = order;
  if (status) doc.status = status;

  await doc.save();
  await recordAudit({ user: req.user, action: 'UPDATE', module: 'CLASSES', recordId: doc._id, recordLabel: doc.name, oldValue: before, newValue: doc.toObject() });
  res.json({ success: true, item: doc });
});

export const deleteClass = asyncHandler(async (req, res) => {
  const doc = await SchoolClass.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Class not found');
  doc.status = 'INACTIVE';
  await doc.save();
  await recordAudit({ user: req.user, action: 'ARCHIVE', module: 'CLASSES', recordId: doc._id, recordLabel: doc.name });
  res.json({ success: true, message: 'Class deactivated' });
});
