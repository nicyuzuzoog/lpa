import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import FeeStructure from '../models/FeeStructure.js';
import InventoryItem from '../models/InventoryItem.js';
import UniformIssuance from '../models/UniformIssuance.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import AcademicYear from '../models/AcademicYear.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getStudentFeeSummary } from '../services/feeService.js';

export async function resolveYearTerm(query) {
  let year = null;
  if (query.academicYear) year = await AcademicYear.findById(query.academicYear);
  if (!year) year = await AcademicYear.findOne({ isActive: true }) || (await AcademicYear.findOne().sort('-startDate'));
  if (!year) return { year: null, term: null };

  let term = query.term;
  if (!term) {
    const activeTerm = year.terms.find((t) => t.status === 'ACTIVE');
    term = activeTerm?.name || year.terms[0]?.name || null;
  }
  return { year, term };
}

async function studentStatusCounts(year, term) {
  const students = await Student.find({ status: 'ACTIVE', ...(year ? { academicYear: year._id } : {}), ...(term ? { term } : {}) });
  let paid = 0;
  let partial = 0;
  let unpaid = 0;
  let expected = 0;
  let collected = 0;
  let outstanding = 0;

  for (const s of students) {
    const summary = await getStudentFeeSummary(s);
    expected += summary.totalRequired;
    collected += summary.totalPaid;
    outstanding += summary.totalBalance;
    if (summary.totalRequired === 0) continue;
    if (summary.overallStatus === 'PAID' || summary.overallStatus === 'OVERPAID') paid += 1;
    else if (summary.overallStatus === 'PARTIALLY_PAID') partial += 1;
    else unpaid += 1;
  }
  return { totalStudents: students.length, paid, partial, unpaid, expected, collected, outstanding };
}

async function commonStats(user, year, term) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

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
        { $group: { _id: null, items: { $sum: 1 }, value: { $sum: { $multiply: ['$currentStock', '$unitCost'] } }, stock: { $sum: '$currentStock' } } },
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

export const getDashboard = asyncHandler(async (req, res) => {
  const { year, term } = await resolveYearTerm(req.query);
  const finances = await studentStatusCounts(year, term);
  const common = await commonStats(req.user, year, term);

  const collectionRate = finances.expected > 0 ? Math.round((finances.collected / finances.expected) * 100) : 0;

  let extra = {};
  if (req.user.role === 'SUPER_ADMIN') {
    const [studentsAll, notifications] = await Promise.all([
      Student.countDocuments(),
      Notification.find().sort('-createdAt').limit(6),
    ]);
    extra = { totalStudentsAll: studentsAll, recentNotifications: notifications };
  }

  res.json({
    success: true,
    role: req.user.role,
    finances,
    collectionRate,
    ...common,
    ...extra,
  });
});
