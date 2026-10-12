import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import FeeStructure from '../models/FeeStructure.js';
import InventoryItem from '../models/InventoryItem.js';
import UniformIssuance from '../models/UniformIssuance.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import AcademicYear from '../models/AcademicYear.js';
import SchoolClass from '../models/SchoolClass.js';
import Attendance from '../models/Attendance.js';
import Assessment from '../models/Assessment.js';
import asyncHandler from '../utils/asyncHandler.js';
import { paymentStatusFor } from '../services/feeService.js';
import { subjectLabel } from '../constants/subjects.js';

const FINANCE_ROLES = ['SUPER_ADMIN', 'ACCOUNTANT', 'BIG_BOSS'];

export async function resolveYearTerm(query) {
  let year = null;
  if (query.academicYear) year = await AcademicYear.findById(query.academicYear);
  if (!year) year = (await AcademicYear.findOne({ isActive: true })) || (await AcademicYear.findOne().sort('-startDate'));
  if (!year) return { year: null, term: null };

  let term = query.term;
  if (!term) {
    const activeTerm = year.terms.find((t) => t.status === 'ACTIVE');
    term = activeTerm?.name || year.terms[0]?.name || null;
  }
  return { year, term };
}

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// ---------------------------------------------------------------------------
// Financial summary for a class of students.
// Uses three bulk queries instead of querying the database once per student.
// ---------------------------------------------------------------------------
async function studentStatusCounts(year, term) {
  const studentFilter = { status: 'ACTIVE' };
  if (year) studentFilter.academicYear = year._id;
  if (term) studentFilter.term = term;

  const students = await Student.find(studentFilter).select('_id class academicYear term').lean();
  if (!students.length) {
    return { totalStudents: 0, paid: 0, partial: 0, unpaid: 0, expected: 0, collected: 0, outstanding: 0 };
  }

  const yearMatch = year ? { academicYear: year._id } : {};

  const [feeAgg, payAgg] = await Promise.all([
    FeeStructure.aggregate([
      { $match: { status: 'ACTIVE', ...yearMatch } },
      { $group: { _id: { c: '$class', y: '$academicYear', t: '$term' }, total: { $sum: '$requiredAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'ACTIVE', ...yearMatch } },
      { $group: { _id: { s: '$student', t: '$term' }, total: { $sum: '$amount' } } },
    ]),
  ]);

  const requiredByKey = new Map(feeAgg.map((f) => [`${f._id.c}|${f._id.y}|${f._id.t}`, f.total]));
  const paidByKey = new Map(payAgg.map((p) => [`${p._id.s}|${p._id.t}`, p.total]));

  let paid = 0;
  let partial = 0;
  let unpaid = 0;
  let expected = 0;
  let collected = 0;
  let outstanding = 0;

  for (const s of students) {
    const required = requiredByKey.get(`${s.class}|${s.academicYear}|${s.term}`) || 0;
    const paidAmount = paidByKey.get(`${s._id}|${s.term}`) || 0;
    expected += required;
    collected += paidAmount;
    outstanding += required - paidAmount;
    if (required === 0) continue;
    const status = paymentStatusFor(required, paidAmount);
    if (status === 'PAID' || status === 'OVERPAID') paid += 1;
    else if (status === 'PARTIALLY_PAID') partial += 1;
    else unpaid += 1;
  }

  return { totalStudents: students.length, paid, partial, unpaid, expected, collected, outstanding };
}

async function commonStats(user, year, term) {
  const startOfToday = startOfTodayUTC();

  const [todayAgg, allAgg, lowStock, inventory, uniformIssued, unread, recentPayments, recentAudit, users] =
    await Promise.all([
      Payment.aggregate([
        { $match: { status: 'ACTIVE', paymentDate: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      year && term
        ? Payment.aggregate([
            { $match: { status: 'ACTIVE', academicYear: year._id, term } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      InventoryItem.find({ status: 'ACTIVE', $expr: { $lte: ['$currentStock', '$minimumStockLevel'] } }),
      InventoryItem.aggregate([
        { $match: { status: 'ACTIVE' } },
        {
          $group: {
            _id: null,
            items: { $sum: 1 },
            value: { $sum: { $multiply: ['$currentStock', '$unitCost'] } },
            stock: { $sum: '$currentStock' },
          },
        },
      ]),
      UniformIssuance.countDocuments(year && term ? { academicYear: year._id, term } : {}),
      Notification.countDocuments({ audience: user._id, readBy: { $ne: user._id } }),
      Payment.find({ status: 'ACTIVE' })
        .populate({ path: 'student', select: 'studentId firstName lastName' })
        .populate('recordedBy', 'fullName username')
        .sort('-paymentDate')
        .limit(6),
      AuditLog.find().populate('user', 'fullName username role').sort('-createdAt').limit(6),
      user.role === 'SUPER_ADMIN' ? User.countDocuments({ status: 'ACTIVE' }) : Promise.resolve(undefined),
    ]);

  const feeCounts = await FeeStructure.aggregate([
    { $match: { status: 'ACTIVE', ...(year ? { academicYear: year._id } : {}), ...(term ? { term } : {}) } },
    { $group: { _id: null, total: { $sum: '$requiredAmount' } } },
  ]);

  return {
    todayCollection: todayAgg[0]?.total || 0,
    todayPayments: todayAgg[0]?.count || 0,
    termCollection: allAgg[0]?.total || 0,
    termPayments: allAgg[0]?.count || 0,
    lowStockItems: lowStock,
    lowStockCount: lowStock.length,
    inventoryItems: inventory[0]?.items || 0,
    inventoryValue: inventory[0]?.value || 0,
    inventoryStock: inventory[0]?.stock || 0,
    uniformIssued,
    unreadNotifications: unread,
    recentPayments,
    recentAudit,
    activeUsers: users,
    feeStructureTotal: feeCounts[0]?.total || 0,
    academicYear: year ? { id: year._id, name: year.name } : null,
    term,
  };
}

// ---------------------------------------------------------------------------
// Teacher dashboard: focus on the classes/subjects they are responsible for.
// ---------------------------------------------------------------------------
async function teacherStats(user, year, term) {
  const classIds = new Set();
  if (user.classTeacherOf) classIds.add(String(user.classTeacherOf));
  for (const a of user.teachingAssignments || []) if (a.class) classIds.add(String(a.class));
  const classIdList = [...classIds];

  const homeroomId = user.classTeacherOf ? String(user.classTeacherOf) : null;
  const today = startOfTodayUTC();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  const pairs = (user.teachingAssignments || []).map((a) => ({ class: a.class, subject: a.subject }));
  const assessmentFilter = {
    ...(year ? { academicYear: year._id } : {}),
    ...(term ? { term } : {}),
    ...(pairs.length ? { $or: pairs } : { _id: null }),
  };

  const [classes, homeroomStudents, attendanceToday, attendanceTrend, assessmentCounts, recentAssessments] =
    await Promise.all([
      classIdList.length
        ? SchoolClass.find({ _id: { $in: classIdList } }).select('name').lean()
        : Promise.resolve([]),
      homeroomId ? Student.countDocuments({ class: homeroomId, status: 'ACTIVE' }) : Promise.resolve(0),
      homeroomId
        ? Attendance.aggregate([
            { $match: { class: new mongoose.Types.ObjectId(homeroomId), date: today } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      homeroomId
        ? Attendance.aggregate([
            { $match: { class: new mongoose.Types.ObjectId(homeroomId), date: { $gte: sevenDaysAgo } } },
            { $group: { _id: { d: '$date', s: '$status' }, count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      Assessment.aggregate([{ $match: assessmentFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Assessment.find(assessmentFilter).sort('-createdAt').limit(5).populate('class', 'name').lean(),
    ]);

  const classNames = new Map(classes.map((c) => [String(c._id), c.name]));

  const attendanceMap = Object.fromEntries(attendanceToday.map((a) => [a._id, a.count]));
  const present = attendanceMap.PRESENT || 0;
  const absent = attendanceMap.ABSENT || 0;
  const late = attendanceMap.LATE || 0;
  const marked = present + absent + late;

  const trendByDate = new Map();
  for (const row of attendanceTrend) {
    const key = new Date(row._id.d).toISOString().slice(0, 10);
    if (!trendByDate.has(key)) trendByDate.set(key, { date: key, present: 0, absent: 0, late: 0 });
    if (row._id.s === 'PRESENT') trendByDate.get(key).present += row.count;
    else if (row._id.s === 'ABSENT') trendByDate.get(key).absent += row.count;
    else if (row._id.s === 'LATE') trendByDate.get(key).late += row.count;
  }

  const subjects = [...new Set((user.teachingAssignments || []).map((a) => a.subject))];
  const statusMap = Object.fromEntries(assessmentCounts.map((c) => [c._id, c.count]));

  return {
    homeroom: homeroomId ? { id: homeroomId, name: classNames.get(homeroomId) || '' } : null,
    homeroomStudents,
    classes: classIdList.map((id) => ({
      id,
      name: classNames.get(id) || '',
      isHomeroom: id === homeroomId,
      subjects: (user.teachingAssignments || [])
        .filter((a) => String(a.class) === id)
        .map((a) => ({ code: a.subject, label: subjectLabel(a.subject) })),
    })),
    subjects: subjects.map((code) => ({ code, label: subjectLabel(code) })),
    todayAttendance: { present, absent, late, marked, total: homeroomStudents, unmarked: Math.max(0, homeroomStudents - marked) },
    attendanceTrend: [...trendByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    assessments: { total: (statusMap.OPEN || 0) + (statusMap.CLOSED || 0), open: statusMap.OPEN || 0, closed: statusMap.CLOSED || 0 },
    recentAssessments: recentAssessments.map((a) => ({
      _id: a._id,
      title: a.title,
      subject: a.subject,
      subjectName: subjectLabel(a.subject),
      className: a.class?.name || '',
      maxMarks: a.maxMarks,
      status: a.status,
      assessmentDate: a.assessmentDate,
      marksEntered: a.marks.filter((m) => m.score != null).length,
    })),
  };
}

export const getDashboard = asyncHandler(async (req, res) => {
  const { year, term } = await resolveYearTerm(req.query);
  const role = req.user.role;

  if (role === 'TEACHER') {
    const [teaching, unread] = await Promise.all([
      teacherStats(req.user, year, term),
      Notification.countDocuments({ audience: req.user._id, readBy: { $ne: req.user._id } }),
    ]);
    return res.json({
      success: true,
      role,
      academicYear: year ? { id: year._id, name: year.name } : null,
      term,
      teaching,
      unreadNotifications: unread,
    });
  }

  const common = await commonStats(req.user, year, term);
  const payload = { success: true, role, ...common };

  if (FINANCE_ROLES.includes(role)) {
    const finances = await studentStatusCounts(year, term);
    payload.finances = finances;
    payload.collectionRate = finances.expected > 0 ? Math.round((finances.collected / finances.expected) * 100) : 0;
  }

  if (role === 'SUPER_ADMIN') {
    const [studentsAll, notifications] = await Promise.all([
      Student.countDocuments(),
      Notification.find().sort('-createdAt').limit(6),
    ]);
    payload.totalStudentsAll = studentsAll;
    payload.recentNotifications = notifications;
  }

  res.json(payload);
});
