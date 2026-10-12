import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination, nextSequence, pad } from '../utils/sequence.js';
import { recordAudit, diffObjects } from '../services/auditService.js';
import { notify } from '../services/notificationService.js';
import { getStudentFeeSummary } from '../services/feeService.js';

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
  const { firstName, lastName, gender, dateOfBirth, class: classId, academicYear, term, status, motherPhone, fatherPhone, photo, notes, studentId } = req.body;

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

export const updateStudent = asyncHandler(async (req, res) => {
  const doc = await Student.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Student not found');
  const before = doc.toObject();

  const allowed = ['firstName', 'lastName', 'gender', 'dateOfBirth', 'class', 'academicYear', 'term', 'status', 'motherPhone', 'fatherPhone', 'photo', 'notes'];
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
