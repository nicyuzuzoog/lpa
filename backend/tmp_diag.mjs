import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(root, '.env') });

const uri = process.env.MONGODB_URI;
console.log('connecting…');
await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
console.log('connected');

async function step(name, fn) {
  try {
    const r = await fn();
    console.log(`OK  ${name} ->`, r);
    return r;
  } catch (e) {
    console.log(`ERR ${name} ->`, e.message);
    return null;
  }
}

const { default: AcademicYear } = await import('./src/models/AcademicYear.js');
const { default: Student } = await import('./src/models/Student.js');
const { default: Payment } = await import('./src/models/Payment.js');
const { default: FeeStructure } = await import('./src/models/FeeStructure.js');
const { default: InventoryItem } = await import('./src/models/InventoryItem.js');
const { default: UniformIssuance } = await import('./src/models/UniformIssuance.js');
const { default: User } = await import('./src/models/User.js');
const { default: Notification } = await import('./src/models/Notification.js');
const { default: AuditLog } = await import('./src/models/AuditLog.js');
const { getStudentFeeSummary } = await import('./src/services/feeService.js');

const year = await step('resolve year', () => AcademicYear.findById(null).exec());
let activeYear = await AcademicYear.findOne({ isActive: true });
if (!activeYear) activeYear = await AcademicYear.findOne().sort('-startDate');
console.log('year ->', activeYear?._id?.toString(), activeYear?.name);

const students = await step('students', () =>
  Student.find({ status: 'ACTIVE', ...(activeYear ? { academicYear: activeYear._id } : {}) })
);
if (students?.length) {
  const s = students[0];
  await step('feeSummary(first student)', () => getStudentFeeSummary(s));
}

const userId = (await User.findOne({}))?._id;
if (userId) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  await step('today agg', () =>
    Payment.aggregate([{ $match: { status: 'ACTIVE', paymentDate: { $gte: dayStart } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }])
  );
  await step('term agg', () =>
    Payment.aggregate([{ $match: { status: 'ACTIVE', academicYear: activeYear?._id, term: activeYear?.terms?.[0]?.name } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }])
  );
  await step('low stock', () => InventoryItem.find({ status: 'ACTIVE', $expr: { $lte: ['$currentStock', '$minimumStockLevel'] } }));
  await step('inventory agg', () => InventoryItem.aggregate([{ $match: { status: 'ACTIVE' } }, { $group: { _id: null, value: { $sum: { $multiply: ['$currentStock', '$unitCost'] } } } }]));
  await step('uniform count', () => UniformIssuance.countDocuments());
  await step('notif count', () => Notification.countDocuments({ audience: userId, readBy: { $ne: userId } }));
  await step('recent payments', () =>
    Payment.find({ status: 'ACTIVE' })
      .populate({ path: 'student', select: 'studentId firstName lastName' })
      .populate('recordedBy', 'fullName username')
      .sort('-paymentDate')
      .limit(6)
  );
  await step('recent audit', () => AuditLog.find({}).populate('user', 'fullName username role').sort('-createdAt').limit(6));
  await step('fee structures', () =>
    FeeStructure.aggregate([{ $match: { status: 'ACTIVE', ...(activeYear ? { academicYear: activeYear._id } : {}) } }, { $group: { _id: null, total: { $sum: '$requiredAmount' } } }])
  );
}

await mongoose.disconnect();
console.log('done');
process.exit(0);