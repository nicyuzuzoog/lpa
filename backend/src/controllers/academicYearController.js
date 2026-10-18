import AcademicYear from '../models/AcademicYear.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { recordAudit } from '../services/auditService.js';

export const listYears = asyncHandler(async (req, res) => {
  const items = await AcademicYear.find().sort({ startDate: -1, name: -1 });
  res.json({ success: true, items });
});

export const createYear = asyncHandler(async (req, res) => {
  const { name, startDate, endDate, isActive, terms } = req.body;
  if (!name) throw new ApiError(400, 'Academic year name is required');
  const exists = await AcademicYear.findOne({ name });
  if (exists) throw new ApiError(409, 'This academic year already exists');

  const doc = await AcademicYear.create({
    name,
    startDate: startDate || null,
    endDate: endDate || null,
    isActive: !!isActive,
    terms: terms?.length ? terms : [{ name: 'Term 1' }, { name: 'Term 2' }, { name: 'Term 3' }],
  });

  if (doc.isActive) await AcademicYear.updateMany({ _id: { $ne: doc._id } }, { isActive: false });

  await recordAudit({ user: req.user, action: 'CREATE', module: 'ACADEMIC_YEARS', recordId: doc._id, recordLabel: doc.name, newValue: doc.toObject() });
  res.status(201).json({ success: true, item: doc });
});

export const updateYear = asyncHandler(async (req, res) => {
  const doc = await AcademicYear.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Academic year not found');
  const before = doc.toObject();

  const { name, startDate, endDate, isActive, terms } = req.body;
  if (name) doc.name = name;
  if (startDate !== undefined) doc.startDate = startDate;
  if (endDate !== undefined) doc.endDate = endDate;
  if (terms) doc.terms = terms;
  if (isActive !== undefined) doc.isActive = !!isActive;

  if (doc.isActive) await AcademicYear.updateMany({ _id: { $ne: doc._id } }, { isActive: false });

  await doc.save();
  await recordAudit({ user: req.user, action: 'UPDATE', module: 'ACADEMIC_YEARS', recordId: doc._id, recordLabel: doc.name, oldValue: before, newValue: doc.toObject() });
  res.json({ success: true, item: doc });
});

export const addTerm = asyncHandler(async (req, res) => {
  const doc = await AcademicYear.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Academic year not found');
  const { name, startDate, endDate } = req.body;
  if (!name) throw new ApiError(400, 'Term name is required');
  if (doc.terms.some((t) => t.name === name)) throw new ApiError(409, 'This term already exists');

  doc.terms.push({ name, startDate, endDate });
  await doc.save();
  await recordAudit({ user: req.user, action: 'ADD_TERM', module: 'ACADEMIC_YEARS', recordId: doc._id, recordLabel: `${doc.name} / ${name}` });
  res.status(201).json({ success: true, item: doc });
});

export const updateTerm = asyncHandler(async (req, res) => {
  const doc = await AcademicYear.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Academic year not found');
  const term = doc.terms.id(req.params.termId);
  if (!term) throw new ApiError(404, 'Term not found');

  const before = term.toObject();
  const { name, startDate, endDate, status } = req.body;
  if (name) term.name = name;
  if (startDate !== undefined) term.startDate = startDate;
  if (endDate !== undefined) term.endDate = endDate;
  if (status) term.status = status;

  await doc.save();
  await recordAudit({ user: req.user, action: 'UPDATE_TERM', module: 'ACADEMIC_YEARS', recordId: doc._id, recordLabel: `${doc.name} / ${term.name}`, oldValue: before, newValue: term.toObject() });
  res.json({ success: true, item: doc });
});
