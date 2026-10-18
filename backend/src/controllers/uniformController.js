import mongoose from 'mongoose';
import UniformItem from '../models/UniformItem.js';
import UniformStockTransaction from '../models/UniformStockTransaction.js';
import UniformIssuance from '../models/UniformIssuance.js';
import UniformEntitlement from '../models/UniformEntitlement.js';
import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/sequence.js';
import { recordAudit, diffObjects } from '../services/auditService.js';
import { notify } from '../services/notificationService.js';

async function stockTx({ uniformItem, type, quantity, date, reason = '' }, user) {
  const qty = Number(quantity) || 0;
  if (qty <= 0) throw new ApiError(400, 'Quantity must be greater than zero');

  if (type === 'RECEIVED') uniformItem.quantityReceived += qty;
  else if (type === 'ISSUED') {
    if (qty > uniformItem.quantityRemaining) {
      throw new ApiError(400, `Insufficient stock. Available: ${uniformItem.quantityRemaining}`);
    }
    uniformItem.quantityIssued += qty;
  } else if (type === 'RETURNED') uniformItem.quantityReturned += qty;
  else if (type === 'DAMAGED') {
    if (qty > uniformItem.quantityRemaining) throw new ApiError(400, 'Quantity exceeds available stock');
    uniformItem.quantityDamaged += qty;
  } else if (type === 'LOST') {
    if (qty > uniformItem.quantityRemaining) throw new ApiError(400, 'Quantity exceeds available stock');
    uniformItem.quantityDamaged += qty;
  } else throw new ApiError(400, 'Invalid transaction type');

  await uniformItem.save();

  const tx = await UniformStockTransaction.create({
    uniformItem: uniformItem._id,
    type,
    quantity: qty,
    balanceAfter: uniformItem.quantityRemaining,
    date: date || new Date(),
    reason,
    performedBy: user._id,
  });

  if (uniformItem.quantityRemaining <= uniformItem.minimumStockLevel && uniformItem.minimumStockLevel > 0) {
    await notify({
      title: 'Low uniform stock',
      message: `${uniformItem.name} (${uniformItem.size}) is low: ${uniformItem.quantityRemaining} remaining`,
      type: 'UNIFORM',
      relatedRecord: { module: 'uniforms', id: String(uniformItem._id) },
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
  if (req.query.gender) filter.gender = req.query.gender;
  if (req.query.size) filter.size = req.query.size;
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    UniformItem.find(filter).sort({ name: 1, size: 1 }).skip(skip).limit(limit),
    UniformItem.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

export const createItem = asyncHandler(async (req, res) => {
  const { name, gender, size, price, quantityReceived, minimumStockLevel, unitCost, status } = req.body;
  if (!name) throw new ApiError(400, 'Item name is required');
  if (price === undefined || Number(price) < 0) throw new ApiError(400, 'A valid price is required');

  const doc = await UniformItem.create({
    name,
    gender: gender || 'UNISEX',
    size: size || 'FREE',
    price: Number(price),
    quantityReceived: Number(quantityReceived) || 0,
    minimumStockLevel: Number(minimumStockLevel) || 0,
    unitCost: Number(unitCost) || 0,
    status,
  });

  if (doc.quantityReceived > 0) {
    await UniformStockTransaction.create({
      uniformItem: doc._id,
      type: 'RECEIVED',
      quantity: doc.quantityReceived,
      balanceAfter: doc.quantityRemaining,
      reason: 'Opening stock',
      performedBy: req.user._id,
    });
  }

  await recordAudit({ user: req.user, action: 'CREATE', module: 'UNIFORMS', recordId: doc._id, recordLabel: `${doc.name} (${doc.size})`, newValue: doc.toObject() });
  res.status(201).json({ success: true, item: doc });
});

export const updateItem = asyncHandler(async (req, res) => {
  const doc = await UniformItem.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Uniform item not found');
  const before = doc.toObject();

  const allowed = ['name', 'gender', 'size', 'price', 'minimumStockLevel', 'unitCost', 'status'];
  for (const key of allowed) if (req.body[key] !== undefined) doc[key] = req.body[key];

  await doc.save();
  const changes = diffObjects(before, doc.toObject(), allowed);
  if (changes) {
    await recordAudit({
      user: req.user,
      action: 'UPDATE',
      module: 'UNIFORMS',
      recordId: doc._id,
      recordLabel: `${doc.name} (${doc.size})`,
      oldValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.from])),
      newValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.to])),
      reason: req.body.reason || '',
    });
  }
  res.json({ success: true, item: doc });
});

export const recordStockTransaction = asyncHandler(async (req, res) => {
  const item = await UniformItem.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Uniform item not found');

  const { type, quantity, date, reason } = req.body;
  if (type === 'ISSUED') throw new ApiError(400, 'Use the uniform distribution page to issue uniforms to students');

  const tx = await stockTx({ uniformItem: item, type, quantity, date, reason }, req.user);
  await recordAudit({
    user: req.user,
    action: type,
    module: 'UNIFORMS',
    recordId: item._id,
    recordLabel: `${item.name} (${item.size}) x${tx.quantity}`,
    oldValue: { stock: tx.balanceAfter - (type === 'RECEIVED' ? tx.quantity : -tx.quantity) },
    newValue: { stock: tx.balanceAfter },
    reason: reason || '',
  });
  res.status(201).json({ success: true, item, transaction: tx });
});

export const listStockTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 30);
  const filter = {};
  if (req.query.uniformItem) filter.uniformItem = req.query.uniformItem;
  if (req.query.type) filter.type = req.query.type;

  const [items, total] = await Promise.all([
    UniformStockTransaction.find(filter)
      .populate({ path: 'uniformItem', select: 'name size gender' })
      .populate('performedBy', 'fullName username role')
      .sort('-date')
      .skip(skip)
      .limit(limit),
    UniformStockTransaction.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

export const issueToStudent = asyncHandler(async (req, res) => {
  const { student: studentRef, academicYear, term, items, notes } = req.body;
  if (!studentRef || !items?.length) throw new ApiError(400, 'Student and at least one item are required');

  const student = await Student.findById(studentRef).populate('class', 'name').populate('academicYear', 'name');
  if (!student) throw new ApiError(404, 'This student does not exist');

  const yearId = academicYear || student.academicYear._id;
  const termName = term || student.term;

  const lineItems = [];
  for (const line of items) {
    const item = await UniformItem.findById(line.uniformItem);
    if (!item) throw new ApiError(404, 'Uniform item not found');
    const qty = Number(line.quantity) || 1;
    if (qty > item.quantityRemaining) {
      throw new ApiError(400, `Insufficient stock for ${item.name} (${item.size}): available ${item.quantityRemaining}`);
    }
    lineItems.push({ uniformItem: item._id, name: item.name, size: item.size, gender: item.gender, quantity: qty, amount: item.price * qty, _item: item });
  }

  for (const line of lineItems) {
    await stockTx({ uniformItem: line._item, type: 'ISSUED', quantity: line.quantity, reason: `Issued to ${student.studentId}` }, req.user);
  }

  const doc = await UniformIssuance.create({
    student: student._id,
    academicYear: yearId,
    term: termName,
    items: lineItems.map(({ _item, ...rest }) => rest),
    notes: notes || '',
    issuedBy: req.user._id,
  });

  await recordAudit({
    user: req.user,
    action: 'ISSUE_UNIFORMS',
    module: 'UNIFORMS',
    recordId: doc._id,
    recordLabel: `${student.studentId} - ${student.firstName} ${student.lastName}`,
    newValue: { items: lineItems.map((l) => `${l.name} (${l.size}) x${l.quantity}`) },
  });

  await notify({
    title: 'Uniforms issued',
    message: `Uniforms issued to ${student.firstName} ${student.lastName} (${student.studentId})`,
    type: 'UNIFORM',
    relatedRecord: { module: 'uniforms', id: String(doc._id) },
    createdBy: req.user._id,
    audienceRoles: ['SUPER_ADMIN', 'ACCOUNTANT'],
  });

  const populated = await doc.populate('issuedBy', 'fullName username');
  res.status(201).json({ success: true, item: populated });
});

export const listIssuances = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.student) filter.student = req.query.student;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.term) filter.term = req.query.term;
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    UniformIssuance.find(filter)
      .populate({ path: 'student', select: 'studentId firstName lastName class' })
      .populate('academicYear', 'name')
      .populate('issuedBy', 'fullName username')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    UniformIssuance.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

// Paid vs issued verification for one student.
export const verifyStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('class', 'name')
    .populate('academicYear', 'name');
  if (!student) throw new ApiError(404, 'Student not found');

  const [packageItems, entitlements, issuances] = await Promise.all([
    UniformItem.find({ status: 'ACTIVE' }).sort({ createdAt: 1 }),
    UniformEntitlement.find({ student: student._id, academicYear: student.academicYear._id, term: student.term }),
    UniformIssuance.find({ student: student._id, academicYear: student.academicYear._id, term: student.term }).sort('-createdAt'),
  ]);

  const entByItem = new Map(entitlements.map((e) => [String(e.uniformItem), e]));
  const issuedMap = new Map();
  for (const iss of issuances) {
    if (iss.status === 'RETURNED') continue;
    for (const line of iss.items) {
      const key = String(line.uniformItem);
      issuedMap.set(key, (issuedMap.get(key) || 0) + line.quantity);
    }
  }

  const rows = packageItems.map((item) => {
    const ent = entByItem.get(String(item._id));
    const issuedQty = issuedMap.get(String(item._id)) || 0;
    return {
      uniformItem: item._id,
      name: item.name,
      size: item.size,
      gender: item.gender,
      required: true,
      price: item.price,
      paid: !!ent,
      paidAmount: ent?.amountCovered || 0,
      paidStatus: ent ? ent.status : 'NOT_PAID',
      issued: issuedQty > 0,
      issuedQuantity: issuedQty,
      stockRemaining: item.quantityRemaining,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      required: acc.required + 1,
      paid: acc.paid + (r.paid ? 1 : 0),
      issued: acc.issued + (r.issued ? 1 : 0),
      notIssued: acc.notIssued + (r.paid && !r.issued ? 1 : 0),
      expectedValue: acc.expectedValue + r.price,
      paidValue: acc.paidValue + r.paidAmount,
    }),
    { required: 0, paid: 0, issued: 0, notIssued: 0, expectedValue: 0, paidValue: 0 }
  );

  res.json({ success: true, student, rows, totals, issuances });
});

// Uniform payments vs remaining balance for one student (uniform is optional — a student
// may buy none, one part, or the whole package).
export const studentUniformBalance = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('class', 'name')
    .populate('academicYear', 'name');
  if (!student) throw new ApiError(404, 'Student not found');

  const academicYearId = student.academicYear?._id || student.academicYear;

  const [items, entitlements, paidAgg] = await Promise.all([
    UniformItem.find({ status: 'ACTIVE' }).sort({ createdAt: 1, _id: 1 }),
    UniformEntitlement.find({ student: student._id, academicYear: academicYearId, term: student.term }),
    Payment.aggregate([
      { $match: { student: student._id, academicYear: academicYearId, term: student.term, feeType: 'UNIFORM', status: 'ACTIVE' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const paid = paidAgg[0]?.total || 0;
  const packageTotal = items.reduce((a, i) => a + i.price, 0);
  const remaining = Math.max(0, packageTotal - paid);

  const entByItem = new Map(entitlements.map((e) => [String(e.uniformItem), e]));
  const rows = items.map((item) => {
    const ent = entByItem.get(String(item._id));
    const covered = ent?.amountCovered || 0;
    return {
      uniformItem: item._id,
      name: item.name,
      size: item.size,
      gender: item.gender,
      price: item.price,
      covered,
      itemRemaining: Math.max(0, item.price - covered),
      status: covered <= 0 ? 'NOT_PAID' : covered >= item.price ? 'PAID' : 'PARTIAL',
    };
  });

  res.json({
    success: true,
    student,
    packageTotal,
    paid,
    remaining,
    overpaid: Math.max(0, paid - packageTotal),
    items: rows,
  });
});

export const distributionReport = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.academicYear) filter.academicYear = new mongoose.Types.ObjectId(req.query.academicYear);
  if (req.query.term) filter.term = req.query.term;

  const [packageItems, entAgg, issAgg] = await Promise.all([
    UniformItem.find({ status: 'ACTIVE' }),
    UniformEntitlement.aggregate([
      ...(Object.keys(filter).length ? [{ $match: filter }] : []),
      { $group: { _id: '$uniformItem', paidCount: { $sum: 1 }, paidValue: { $sum: '$amountCovered' } } },
    ]),
    UniformIssuance.aggregate([
      ...(Object.keys(filter).length ? [{ $match: filter }] : []),
      { $unwind: '$items' },
      { $group: { _id: '$items.uniformItem', issuedQty: { $sum: '$items.quantity' } } },
    ]),
  ]);

  const entMap = new Map(entAgg.map((e) => [String(e._id), e]));
  const issMap = new Map(issAgg.map((e) => [String(e._id), e]));

  const rows = packageItems.map((item) => {
    const ent = entMap.get(String(item._id));
    const iss = issMap.get(String(item._id));
    const paid = ent?.paidCount || 0;
    const issued = iss?.issuedQty || 0;
    return {
      name: item.name,
      size: item.size,
      gender: item.gender,
      price: item.price,
      paidCount: paid,
      paidValue: ent?.paidValue || 0,
      issuedQuantity: issued,
      notIssued: Math.max(0, paid - issued),
      stockRemaining: item.quantityRemaining,
      quantityReceived: item.quantityReceived,
      quantityIssued: item.quantityIssued,
    };
  });

  const bySize = {};
  const byGender = {};
  for (const r of rows) {
    bySize[r.size] = (bySize[r.size] || 0) + r.stockRemaining;
    byGender[r.gender] = (byGender[r.gender] || 0) + r.stockRemaining;
  }

  res.json({
    success: true,
    rows,
    bySize,
    byGender,
    totals: {
      paid: rows.reduce((a, r) => a + r.paidCount, 0),
      issued: rows.reduce((a, r) => a + r.issuedQuantity, 0),
      notIssued: rows.reduce((a, r) => a + r.notIssued, 0),
      stockRemaining: rows.reduce((a, r) => a + r.stockRemaining, 0),
      paidValue: rows.reduce((a, r) => a + r.paidValue, 0),
    },
  });
});
