import FeeStructure from '../models/FeeStructure.js';
import Payment from '../models/Payment.js';
import PaymentReversal from '../models/PaymentReversal.js';
import Student from '../models/Student.js';
import Setting from '../models/Setting.js';
import UniformEntitlement from '../models/UniformEntitlement.js';
import UniformItem from '../models/UniformItem.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination, nextSequence, pad } from '../utils/sequence.js';
import { recordAudit, diffObjects } from '../services/auditService.js';
import { notify } from '../services/notificationService.js';
import { allocatedPaidFor, batchFeeSummaries, getStudentFeeSummary, mealsRequiredFor, paymentStatusFor, refreshUniformEntitlements } from '../services/feeService.js';

function normalizeDay(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid date');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function requiredFor(student, feeType) {
  // Meals: every student who eats at school owes the feeding charge (no fee structure).
  if (feeType === 'MEALS') return mealsRequiredFor(student);
  const structure = await FeeStructure.findOne({
    class: student.class,
    academicYear: student.academicYear,
    term: student.term,
    feeType,
    status: 'ACTIVE',
  });
  return structure ? structure.requiredAmount : 0;
}

async function paidFor(student, feeType, excludePaymentId = null) {
  const academicYearId = student.academicYear?._id || student.academicYear;
  const match = {
    student: student._id,
    academicYear: academicYearId,
    term: student.term,
    feeType,
    status: 'ACTIVE',
  };
  if (excludePaymentId) match._id = { $ne: excludePaymentId };
  const agg = await Payment.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  return agg[0]?.total || 0;
}

// How much of the student's money is already allocated to this fee type
// (meals-first waterfall; uniform keeps its own per-type tracking).
async function settledPaidFor(student, feeType, opts = {}) {
  if (feeType === 'UNIFORM') {
    const own = await paidFor(student, feeType, opts.excludePaymentId);
    return own + Number(opts.extraAmount || 0);
  }
  return allocatedPaidFor(student, feeType, opts);
}

async function nextReceiptNumber(date = new Date()) {
  const prefix = (await Setting.get('receipt_prefix', 'RCT')) || 'RCT';
  const seq = await nextSequence('receipt');
  const y = date.getFullYear();
  return `${prefix}-${y}-${pad(seq, 6)}`;
}

export const listPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.receiptNumber) filter.receiptNumber = new RegExp(String(req.query.receiptNumber).trim(), 'i');
  if (req.query.student) filter.student = req.query.student;
  if (req.query.feeType) filter.feeType = req.query.feeType;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
  if (req.query.status) filter.status = req.query.status;
  else filter.status = { $ne: 'VOID' };
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.term) filter.term = req.query.term;
  if (req.query.class) filter.class = req.query.class;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.paymentDate = {};
    if (req.query.dateFrom) filter.paymentDate.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) {
      const to = new Date(req.query.dateTo);
      to.setHours(23, 59, 59, 999);
      filter.paymentDate.$lte = to;
    }
  }
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).trim(), 'i');
    filter.$or = [{ receiptNumber: rx }];
  }

  if (req.query.class) {
    const students = await Student.find({ class: req.query.class }).select('_id');
    filter.student = { $in: [...students.map((s) => s._id), ...(filter.student ? [filter.student] : [])] };
  }

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate({ path: 'student', select: 'studentId firstName lastName class' })
      .populate('academicYear', 'name')
      .populate('recordedBy', 'fullName username role')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  const sumAgg = await Payment.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  res.json({
    success: true,
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    totalAmount: sumAgg[0]?.total || 0,
  });
});

export const createPayment = asyncHandler(async (req, res) => {
  const { student: studentRef, feeType, amount, paymentMethod, paymentDate, note, receiptNumber, payerName, dueDate } = req.body;
  if (!studentRef || !feeType || !paymentMethod) throw new ApiError(400, 'Student, fee type and payment method are required');
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) throw new ApiError(400, 'Payment amount is required');
  if (Number(amount) <= 0) throw new ApiError(400, 'Payment amount cannot be zero or negative');

  if (['BANK', 'MOBILE_MONEY'].includes(paymentMethod) && !String(payerName || '').trim()) {
    throw new ApiError(400, 'Enter the name of the person who paid (required for bank and mobile money payments)');
  }

  const student = await Student.findById(studentRef).populate('class', 'name').populate('academicYear', 'name');
  if (!student) throw new ApiError(404, 'This student does not exist');

  if (req.body.academicYear && String(req.body.academicYear) !== String(student.academicYear._id)) {
    throw new ApiError(400, 'Payment academic year must match the student academic year');
  }
  if (req.body.term && req.body.term !== student.term) {
    throw new ApiError(400, 'Payment term must match the student term');
  }

  if (receiptNumber) {
    const dup = await Payment.findOne({ receiptNumber: receiptNumber.toUpperCase().trim() });
    if (dup) throw new ApiError(409, 'This receipt number already exists');
  }

  const required = await requiredFor(student, feeType);
  const settledBefore = await settledPaidFor(student, feeType);
  const balanceBefore = required - settledBefore;
  const settledAfter = await settledPaidFor(student, feeType, { extraAmount: Number(amount) });
  const balanceAfter = required - settledAfter;

  const payDate = paymentDate ? new Date(paymentDate) : new Date();
  let due = null;
  if (dueDate) due = normalizeDay(dueDate);
  if (balanceAfter > 0 && !due) {
    throw new ApiError(400, 'Enter the date the student will come back to pay the remaining balance');
  }
  if (due && normalizeDay(payDate).getTime() > due.getTime()) {
    throw new ApiError(400, 'The come-back-to-pay date cannot be before the payment date');
  }

  const doc = await Payment.create({
    receiptNumber: receiptNumber ? receiptNumber.toUpperCase().trim() : await nextReceiptNumber(payDate),
    student: student._id,
    academicYear: student.academicYear._id,
    term: student.term,
    feeType,
    amount: Number(amount),
    paymentMethod,
    payerName: String(payerName || '').trim(),
    paymentDate: payDate,
    dueDate: due,
    recordedBy: req.user._id,
    balanceBefore,
    balanceAfter,
    note: note || '',
  });

  if (feeType === 'UNIFORM') {
    await refreshUniformEntitlements({ student, academicYear: student.academicYear._id, term: student.term, payment: doc });
  }

  await recordAudit({
    user: req.user,
    action: 'CREATE_PAYMENT',
    module: 'PAYMENTS',
    recordId: doc._id,
    recordLabel: doc.receiptNumber,
    newValue: {
      student: `${student.studentId} - ${student.firstName} ${student.lastName}`,
      feeType,
      amount: doc.amount,
      paymentMethod,
      balanceAfter,
    },
  });

  await notify({
    title: 'Payment recorded',
    message: `${doc.receiptNumber}: ${doc.amount.toLocaleString()} RWF received from ${student.firstName} ${student.lastName} (${feeType})`,
    type: 'PAYMENT',
    relatedRecord: { module: 'payments', id: String(doc._id) },
    createdBy: req.user._id,
  });

  const populated = await doc.populate([
    { path: 'student', select: 'studentId firstName lastName class' },
    { path: 'academicYear', select: 'name' },
    { path: 'recordedBy', select: 'fullName username role' },
  ]);

  res.status(201).json({ success: true, item: populated });
});

export const getPayment = asyncHandler(async (req, res) => {
  const doc = await Payment.findById(req.params.id)
    .populate({ path: 'student', select: 'studentId firstName lastName class gender motherPhone fatherPhone' })
    .populate('academicYear', 'name')
    .populate('recordedBy', 'fullName username role');
  if (!doc) throw new ApiError(404, 'Payment not found');
  const corrections = await PaymentReversal.find({ payment: doc._id }).populate('changedBy', 'fullName username role');
  res.json({ success: true, item: doc, corrections });
});

export const getReceipt = asyncHandler(async (req, res) => {
  const doc = await Payment.findById(req.params.id)
    .populate({ path: 'student', select: 'studentId firstName lastName class gender' })
    .populate('academicYear', 'name')
    .populate('recordedBy', 'fullName username role');
  if (!doc) throw new ApiError(404, 'Payment not found');

  const student = await Student.findById(doc.student._id).populate('class', 'name').populate('academicYear', 'name');
  const summary = await getStudentFeeSummary(student, { feeType: doc.feeType });

  const settings = {
    schoolName: (await Setting.get('school_name', 'Light Peace Academy')) || 'Light Peace Academy',
    schoolLogo: (await Setting.get('school_logo', '')) || '',
    schoolAddress: (await Setting.get('school_address', '')) || '',
    schoolPhone: (await Setting.get('school_phone', '')) || '',
    schoolEmail: (await Setting.get('school_email', '')) || '',
  };

  res.json({
    success: true,
    receipt: { ...doc.toObject(), student, academicYear: doc.academicYear },
    feeRow: summary.rows.find((r) => r.feeType === doc.feeType) || null,
    settings,
  });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const doc = await Payment.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Payment not found');
  if (doc.status !== 'ACTIVE') throw new ApiError(400, `This payment has already been ${doc.status.toLowerCase()}`);
  const reason = req.body.reason;
  if (!reason || !String(reason).trim()) throw new ApiError(400, 'A reason is required to edit a payment');

  const before = doc.toObject();
  const allowed = ['amount', 'paymentMethod', 'paymentDate', 'feeType', 'note', 'payerName', 'dueDate'];
  for (const key of allowed) if (req.body[key] !== undefined && req.body[key] !== '') doc[key] = req.body[key];
  if (Number(doc.amount) <= 0) throw new ApiError(400, 'Payment amount cannot be negative');
  if (['BANK', 'MOBILE_MONEY'].includes(doc.paymentMethod) && !String(doc.payerName || '').trim()) {
    throw new ApiError(400, 'Enter the name of the person who paid (required for bank and mobile money payments)');
  }

  const changes = diffObjects(before, doc.toObject(), allowed);
  if (!changes) throw new ApiError(400, 'No changes detected');

  const student = await Student.findById(doc.student);
  const required = await requiredFor(student, doc.feeType);
  const otherPaid = await settledPaidFor(student, doc.feeType, { excludePaymentId: doc._id });
  doc.balanceBefore = required - otherPaid;
  doc.balanceAfter = required - (await settledPaidFor(student, doc.feeType, { excludePaymentId: doc._id, extraAmount: Number(doc.amount) }));

  if (doc.balanceAfter > 0 && !doc.dueDate) {
    throw new ApiError(400, 'Enter the date the student will come back to pay the remaining balance');
  }
  if (doc.dueDate && normalizeDay(doc.paymentDate).getTime() > normalizeDay(doc.dueDate).getTime()) {
    throw new ApiError(400, 'The come-back-to-pay date cannot be before the payment date');
  }

  await doc.save();

  await PaymentReversal.create({
    payment: doc._id,
    type: 'CORRECTION',
    originalAmount: before.amount,
    correctedAmount: doc.amount,
    reason: String(reason).trim(),
    changedBy: req.user._id,
  });

  if (doc.feeType === 'UNIFORM') {
    await UniformEntitlement.deleteMany({ payment: doc._id });
    await refreshUniformEntitlements({ student, academicYear: doc.academicYear, term: doc.term, payment: doc });
  }

  await recordAudit({
    user: req.user,
    action: 'CORRECT_PAYMENT',
    module: 'PAYMENTS',
    recordId: doc._id,
    recordLabel: doc.receiptNumber,
    oldValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.from])),
    newValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.to])),
    reason: String(reason).trim(),
  });

  await notify({
    title: 'Payment corrected',
    message: `${doc.receiptNumber} was corrected by ${req.user.fullName}. Reason: ${reason}`,
    type: 'PAYMENT',
    relatedRecord: { module: 'payments', id: String(doc._id) },
    createdBy: req.user._id,
  });

  res.json({ success: true, item: await doc.populate([{ path: 'student', select: 'studentId firstName lastName' }, { path: 'recordedBy', select: 'fullName username' }]) });
});

async function settlePayment(req, res, status, type) {
  const doc = await Payment.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Payment not found');
  if (doc.status !== 'ACTIVE') throw new ApiError(400, `This payment has already been ${doc.status.toLowerCase()}`);
  const reason = req.body.reason;
  if (!reason || !String(reason).trim()) throw new ApiError(400, `A reason is required to ${type.toLowerCase()} a payment`);

  doc.status = status;
  await doc.save();

  await PaymentReversal.create({
    payment: doc._id,
    type,
    originalAmount: doc.amount,
    reason: String(reason).trim(),
    changedBy: req.user._id,
  });

  const student = await Student.findById(doc.student);

  if (doc.feeType === 'UNIFORM' && student) {
    await UniformEntitlement.deleteMany({ payment: doc._id });
    await refreshUniformEntitlements({ student, academicYear: doc.academicYear, term: doc.term });
  }

  await recordAudit({
    user: req.user,
    action: `${type}_PAYMENT`,
    module: 'PAYMENTS',
    recordId: doc._id,
    recordLabel: doc.receiptNumber,
    oldValue: { status: 'ACTIVE', amount: doc.amount },
    newValue: { status },
    reason: String(reason).trim(),
  });

  await notify({
    title: `Payment ${type.toLowerCase()}ed`,
    message: `${doc.receiptNumber} (${doc.amount.toLocaleString()} RWF) was ${type.toLowerCase()}ed by ${req.user.fullName}`,
    type: 'PAYMENT',
    relatedRecord: { module: 'payments', id: String(doc._id) },
    createdBy: req.user._id,
  });

  res.json({ success: true, item: doc });
}

export const reversePayment = asyncHandler(async (req, res) => settlePayment(req, res, 'REVERSED', 'REVERSAL'));
export const voidPayment = asyncHandler(async (req, res) => settlePayment(req, res, 'VOID', 'VOID'));

export const studentBalances = asyncHandler(async (req, res) => {
  const filter = { status: 'ACTIVE' };
  if (req.query.class) filter.class = req.query.class;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.term) filter.term = req.query.term;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).trim(), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { studentId: rx }];
  }

  const students = await Student.find(filter)
    .populate('class', 'name')
    .populate('academicYear', 'name')
    .sort({ firstName: 1, lastName: 1 })
    .limit(1000);

  const summaries = await batchFeeSummaries(students);

  let rows = students.map((s) => {
    const summary = summaries.get(String(s._id));
    return {
      student: s,
      name: s.fullName || `${s.firstName} ${s.lastName}`.trim(),
      studentId: s.studentId,
      class: s.class?.name || '',
      academicYear: s.academicYear?.name || '',
      term: s.term || '',
      required: summary.totalRequired,
      paid: summary.totalPaid,
      balance: summary.totalBalance,
      status: summary.overallStatus,
      breakdown: summary.rows,
    };
  });

  if (req.query.status) {
    const wanted = String(req.query.status).trim().toUpperCase();
    rows = rows.filter((r) => r.status === wanted);
  }

  const totals = rows.reduce(
    (acc, r) => ({ required: acc.required + r.required, paid: acc.paid + r.paid, balance: acc.balance + r.balance }),
    { required: 0, paid: 0, balance: 0 }
  );

  res.json({ success: true, items: rows, totals });
});

export { paymentStatusFor };
