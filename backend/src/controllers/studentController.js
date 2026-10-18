import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination, nextSequence, pad } from '../utils/sequence.js';
import { recordAudit, diffObjects } from '../services/auditService.js';
import { notify } from '../services/notificationService.js';
import { batchFeeSummaries, getStudentFeeSummary, paymentStatusFor } from '../services/feeService.js';

export const listStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { studentId: rx }];
  }
  if (req.query.class) filter.class = req.query.class;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.term) filter.term = req.query.term;
  if (req.query.gender) filter.gender = req.query.gender;
  if (req.query.eatsAtSchool !== undefined && req.query.eatsAtSchool !== '') {
    filter.eatsAtSchool = req.query.eatsAtSchool === 'true';
  }

  const [items, total] = await Promise.all([
    Student.find(filter)
      .populate('class', 'name level')
      .populate('academicYear', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Student.countDocuments(filter),
  ]);

  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('class', 'name level')
    .populate('academicYear', 'name');
  if (!student) throw new ApiError(404, 'Student not found');

  const feeSummary = await getStudentFeeSummary(student);
  const payments = await Payment.find({ student: student._id }).sort('-paymentDate').populate('recordedBy', 'fullName username');

  res.json({ success: true, item: student, feeSummary, payments });
});

export const createStudent = asyncHandler(async (req, res) => {
  const { firstName, lastName, gender, dateOfBirth, class: classId, academicYear, term, status, motherPhone, fatherPhone, photo, notes, studentId, eatsAtSchool } = req.body;

  if (!firstName || !lastName || !gender || !classId || !academicYear || !term) {
    throw new ApiError(400, 'First name, last name, gender, class, academic year and term are required');
  }

  let id = studentId?.trim().toUpperCase();
  if (id) {
    const dup = await Student.findOne({ studentId: id });
    if (dup) throw new ApiError(409, 'This student ID already exists');
  } else {
    const year = new Date().getFullYear();
    id = `STU-${year}-${pad(await nextSequence('student'), 4)}`;
  }

  const doc = await Student.create({
    studentId: id,
    firstName,
    lastName,
    gender,
    dateOfBirth: dateOfBirth || null,
    class: classId,
    academicYear,
    term,
    status: status || 'ACTIVE',
    eatsAtSchool: !!eatsAtSchool,
    motherPhone: motherPhone || '',
    fatherPhone: fatherPhone || '',
    photo: photo || '',
    notes: notes || '',
  });

  await recordAudit({
    user: req.user,
    action: 'CREATE',
    module: 'STUDENTS',
    recordId: doc._id,
    recordLabel: `${doc.studentId} - ${doc.firstName} ${doc.lastName}`,
    newValue: doc.toObject(),
  });
  await notify({
    title: 'Student added',
    message: `${doc.firstName} ${doc.lastName} (${doc.studentId}) was enrolled`,
    type: 'STUDENT',
    relatedRecord: { module: 'students', id: String(doc._id) },
    createdBy: req.user._id,
  });

  const populated = await doc.populate([
    { path: 'class', select: 'name level' },
    { path: 'academicYear', select: 'name' },
  ]);
  res.status(201).json({ success: true, item: populated });
});

// Students who eat at the school (school feeding programme).
// Each eater owes the feeding charge (default 40,000 RWF/term); any money the
// family pays is allocated to meals first, the rest goes to supplies/tuition.
export const listMealStudents = asyncHandler(async (req, res) => {
  const filter = { eatsAtSchool: true, status: 'ACTIVE' };
  if (req.query.class) {
    if (!mongoose.Types.ObjectId.isValid(req.query.class)) throw new ApiError(400, 'Invalid class filter');
    filter.class = req.query.class;
  }
  if (req.query.academicYear) {
    if (!mongoose.Types.ObjectId.isValid(req.query.academicYear)) throw new ApiError(400, 'Invalid academic year filter');
    filter.academicYear = req.query.academicYear;
  }
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
    const mealsRow = summaries.get(String(s._id))?.rows.find((r) => r.feeType === 'MEALS');
    const required = mealsRow?.required || 0;
    const paid = mealsRow?.paid || 0;
    const balance = required - paid;
    return {
      student: s,
      name: s.fullName || `${s.firstName} ${s.lastName}`.trim(),
      studentId: s.studentId,
      class: s.class?.name || '',
      academicYear: s.academicYear?.name || '',
      term: s.term || '',
      required,
      paid,
      balance,
      status: paymentStatusFor(required, paid),
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

export const updateStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Student not found');
  const before = doc.toObject();

  const allowed = ['firstName', 'lastName', 'gender', 'dateOfBirth', 'class', 'academicYear', 'term', 'status', 'motherPhone', 'fatherPhone', 'photo', 'notes', 'eatsAtSchool'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) doc[key] = req.body[key] === '' && ['motherPhone', 'fatherPhone', 'photo', 'notes'].includes(key) ? '' : req.body[key];
  }

  await doc.save();
  const changes = diffObjects(before, doc.toObject(), allowed);

  await recordAudit({
    user: req.user,
    action: 'UPDATE',
    module: 'STUDENTS',
    recordId: doc._id,
    recordLabel: `${doc.studentId} - ${doc.firstName} ${doc.lastName}`,
    oldValue: changes ? Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.from])) : null,
    newValue: changes,
    reason: req.body.reason || '',
  });

  if (changes) {
    await notify({
      title: 'Student updated',
      message: `${doc.firstName} ${doc.lastName} record was updated`,
      type: 'STUDENT',
      relatedRecord: { module: 'students', id: String(doc._id) },
      createdBy: req.user._id,
    });
  }

  const populated = await doc.populate([
    { path: 'class', select: 'name level' },
    { path: 'academicYear', select: 'name' },
  ]);
  res.json({ success: true, item: populated, changes });
});
