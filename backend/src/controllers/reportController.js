import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import FeeStructure from '../models/FeeStructure.js';
import InventoryItem from '../models/InventoryItem.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import UniformItem from '../models/UniformItem.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { batchFeeSummaries, getStudentFeeSummary } from '../services/feeService.js';
import { resolveYearTerm } from './dashboardController.js';

function dateRangeFilter(req) {
  const filter = {};
  if (req.query.dateFrom || req.query.dateTo) {
    filter.paymentDate = {};
    if (req.query.dateFrom) filter.paymentDate.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) {
      const to = new Date(req.query.dateTo);
      to.setHours(23, 59, 59, 999);
      filter.paymentDate.$lte = to;
    }
  }
  return filter;
}

async function basePaymentMatch(req) {
  const { year, term } = await resolveYearTerm(req.query);
  const match = { status: 'ACTIVE' };
  if (year) match.academicYear = year._id;
  if (term && !req.query.allTerms) match.term = term;
  if (req.query.feeType) match.feeType = req.query.feeType;
  if (req.query.paymentMethod) match.paymentMethod = req.query.paymentMethod;
  if (req.query.class) {
    const students = await Student.find({ class: req.query.class }).select('_id');
    match.student = { $in: students.map((s) => s._id) };
  }
  return { match: { ...match, ...dateRangeFilter(req) }, year, term };
}

export const collectionByPeriod = asyncHandler(async (req, res) => {
  const period = req.query.period || 'daily';
  const groupFormat = period === 'monthly' ? '%Y-%m' : period === 'weekly' ? '%G-W%V' : '%Y-%m-%d';
  const { match } = await basePaymentMatch(req);

  const rows = await Payment.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: groupFormat, date: '$paymentDate' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const totals = rows.reduce((a, r) => ({ total: a.total + r.total, count: a.count + r.count }), { total: 0, count: 0 });
  res.json({ success: true, period, rows, totals });
});

export const breakdown = asyncHandler(async (req, res) => {
  const { match } = await basePaymentMatch(req);
  const dimension = req.query.dimension || 'feeType';

  if (dimension === 'class') {
    const byClass = await Payment.aggregate([
      { $match: match },
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $group: { _id: '$student.class', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'schoolclasses', localField: '_id', foreignField: '_id', as: 'cls' } },
      { $unwind: { path: '$cls', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, key: '$cls.name', total: 1, count: 1 } },
      { $sort: { total: -1 } },
    ]);
    return res.json({ success: true, dimension, rows: byClass });
  }

  const allowed = {
    feeType: '$feeType',
    paymentMethod: '$paymentMethod',
    status: '$status',
    term: '$term',
  };
  if (!allowed[dimension]) throw new ApiError(400, 'Invalid dimension');

  const rows = await Payment.aggregate([
    { $match: match },
    { $group: { _id: allowed[dimension], total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  res.json({ success: true, dimension, rows: rows.map((r) => ({ ...r, key: r._id })) });
});

export const outstandingBalances = asyncHandler(async (req, res) => {
  const { year, term } = await resolveYearTerm(req.query);
  const filter = { status: 'ACTIVE' };
  if (year) filter.academicYear = year._id;
  if (term) filter.term = term;
  if (req.query.class) filter.class = req.query.class;
  if (req.query.status) filter.status = req.query.status;

  const students = await Student.find(filter).populate('class', 'name').populate('academicYear', 'name');
  const summaries = await batchFeeSummaries(students);
  const rows = [];
  for (const s of students) {
    const summary = summaries.get(String(s._id));
    if (!summary) continue;
    if (summary.totalRequired === 0 && summary.totalPaid === 0) continue;
    rows.push({
      studentId: s.studentId,
      name: `${s.firstName} ${s.lastName}`,
      class: s.class?.name,
      academicYear: s.academicYear?.name,
      term: s.term,
      required: summary.totalRequired,
      paid: summary.totalPaid,
      balance: summary.totalBalance,
      status: summary.overallStatus,
    });
  }

  const filtered = req.query.status ? rows.filter((r) => r.status === req.query.status) : rows;
  const totals = filtered.reduce(
    (a, r) => ({ required: a.required + r.required, paid: a.paid + r.paid, balance: a.balance + r.balance }),
    { required: 0, paid: 0, balance: 0 }
  );

  res.json({ success: true, items: filtered, totals });
});

export const studentStatement = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.studentId)
    .populate('class', 'name')
    .populate('academicYear', 'name');
  if (!student) throw new ApiError(404, 'Student not found');

  const filter = { student: student._id, status: { $ne: 'VOID' } };
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.term) filter.term = req.query.term;

  const [payments, summary] = await Promise.all([
    Payment.find(filter).sort('paymentDate').populate('recordedBy', 'fullName username'),
    getStudentFeeSummary(student),
  ]);

  res.json({ success: true, student, payments, summary });
});

export const inventoryReport = asyncHandler(async (req, res) => {
  const type = req.query.type || 'current';
  const dateFilter = dateRangeFilter(req);
  delete dateFilter.paymentDate;

  if (type === 'current') {
    const items = await InventoryItem.find({ status: 'ACTIVE' }).sort({ name: 1 });
    const valuation = items.reduce((a, i) => a + i.currentStock * i.unitCost, 0);
    const low = items.filter((i) => i.currentStock <= i.minimumStockLevel);
    return res.json({ success: true, rows: items, valuation, lowStock: low });
  }

  const match = {};
  if (req.query.dateFrom) match.date = { ...(match.date || {}), $gte: new Date(req.query.dateFrom) };
  if (req.query.dateTo) {
    const to = new Date(req.query.dateTo);
    to.setHours(23, 59, 59, 999);
    match.date = { ...(match.date || {}), $lte: to };
  }
  if (req.query.category) match.category = req.query.category;

  const rows = await InventoryTransaction.aggregate([
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $group: { _id: { item: '$item', type: '$type' }, quantity: { $sum: '$quantity' }, count: { $sum: 1 } } },
    { $lookup: { from: 'inventoryitems', localField: '_id.item', foreignField: '_id', as: 'item' } },
    { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, item: '$item.name', unit: '$item.unit', category: '$item.category', type: '$_id.type', quantity: 1, count: 1 } },
    { $sort: { item: 1 } },
  ]);

  res.json({ success: true, rows });
});

export const uniformReport = asyncHandler(async (req, res) => {
  const { year, term } = await resolveYearTerm(req.query);
  const match = {};
  if (year) match.academicYear = year._id;
  if (term) match.term = term;
  if (req.query.student) match.student = new mongoose.Types.ObjectId(req.query.student);

  const uniformPayments = await Payment.aggregate([
    { $match: { ...match, feeType: 'UNIFORM', status: 'ACTIVE' } },
    { $group: { _id: '$student', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        studentId: '$student.studentId',
        name: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
        total: 1,
        count: 1,
      },
    },
    { $sort: { name: 1 } },
  ]);

  const stock = await UniformItem.find({ status: 'ACTIVE' }).sort({ name: 1, size: 1 });
  const collected = uniformPayments.reduce((a, r) => a + r.total, 0);

  res.json({
    success: true,
    payments: uniformPayments,
    stock,
    totals: {
      collected,
      paidValue: collected,
      studentsPaid: uniformPayments.length,
      stockRemaining: stock.reduce((a, s) => a + s.quantityRemaining, 0),
      stockIssued: stock.reduce((a, s) => a + s.quantityIssued, 0),
    },
  });
});

export const feeStructuresReport = asyncHandler(async (req, res) => {
  const { year, term } = await resolveYearTerm(req.query);
  const filter = { status: 'ACTIVE' };
  if (year) filter.academicYear = year._id;
  if (term) filter.term = term;

  const rows = await FeeStructure.find(filter)
    .populate('class', 'name')
    .populate('academicYear', 'name')
    .sort({ term: 1, feeType: 1 });

  res.json({ success: true, rows, total: rows.reduce((a, r) => a + r.requiredAmount, 0) });
});
