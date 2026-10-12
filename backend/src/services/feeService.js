import FeeStructure from '../models/FeeStructure.js';
import Payment from '../models/Payment.js';
import UniformEntitlement from '../models/UniformEntitlement.js';
import UniformItem from '../models/UniformItem.js';

export function paymentStatusFor(required, paid) {
  if (paid <= 0) return 'UNPAID';
  if (paid < required) return 'PARTIALLY_PAID';
  if (paid === required) return 'PAID';
  return 'OVERPAID';
}

// Uniform is optional: a student who buys no uniform is not treated as owing.
export const OPTIONAL_FEE_TYPES = ['UNIFORM'];

export async function getStudentFeeSummary(student, { feeType = null } = {}) {
  const academicYearId = student.academicYear?._id || student.academicYear;
  const classId = student.class?._id || student.class;

  const filter = {
    academicYear: academicYearId,
    term: student.term,
    class: classId,
    status: 'ACTIVE',
  };
  if (feeType) filter.feeType = feeType;
  const structures = await FeeStructure.find(filter).populate('class', 'name').lean();

  const paidAgg = await Payment.aggregate([
    {
      $match: {
        student: student._id,
        academicYear: academicYearId,
        term: student.term,
        status: 'ACTIVE',
        ...(feeType ? { feeType } : {}),
      },
    },
    { $group: { _id: '$feeType', paid: { $sum: '$amount' } } },
  ]);
  const paidMap = Object.fromEntries(paidAgg.map((p) => [p._id, p.paid]));

  const rows = structures.map((s) => {
    const paid = paidMap[s.feeType] || 0;
    const required = s.requiredAmount;
    return {
      feeType: s.feeType,
      required,
      paid,
      balance: required - paid,
      status: paymentStatusFor(required, paid),
      className: s.class?.name,
      optional: OPTIONAL_FEE_TYPES.includes(s.feeType),
    };
  });

  // Optional fees (e.g. uniform) never drive the student's balance or overall status.
  const billable = feeType ? rows : rows.filter((r) => !r.optional);
  const required = billable.reduce((a, r) => a + r.required, 0);
  const paid = billable.reduce((a, r) => a + r.paid, 0);

  return {
    rows,
    totalRequired: required,
    totalPaid: paid,
    totalBalance: required - paid,
    overallStatus: required === 0 ? 'UNPAID' : paymentStatusFor(required, paid),
  };
}

// Keeps a student's uniform entitlements in sync with their ACTIVE uniform payments:
// allocates new coverage, tops up partially covered items, and revokes coverage on reversals.
export async function refreshUniformEntitlements({ student, academicYear, term, payment = null }) {
  const academicYearId = academicYear?._id || academicYear;
  const paidAgg = await Payment.aggregate([
    { $match: { student: student._id, academicYear: academicYearId, term, feeType: 'UNIFORM', status: 'ACTIVE' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalPaid = paidAgg[0]?.total || 0;

  const existing = await UniformEntitlement.find({ student: student._id, academicYear: academicYearId, term }).sort({ createdAt: 1 });
  let covered = existing.reduce((sum, e) => sum + e.amountCovered, 0);

  // Revoke coverage from the most recent entitlements when payments are reversed/edited.
  while (covered > totalPaid && existing.length) {
    const last = existing[existing.length - 1];
    const excess = covered - totalPaid;
    if (last.amountCovered <= excess) {
      covered -= last.amountCovered;
      existing.pop();
      await last.deleteOne();
    } else {
      last.amountCovered -= excess;
      last.status = last.amountCovered >= last.price ? 'PAID' : 'PARTIAL';
      await last.save();
      covered -= excess;
    }
  }

  let remaining = totalPaid - covered;
  if (remaining <= 0) return [];

  const items = await UniformItem.find({ status: 'ACTIVE' }).sort({ createdAt: 1, _id: 1 });
  const byItem = new Map(existing.map((e) => [String(e.uniformItem), e]));
  const created = [];

  for (const item of items) {
    if (remaining <= 0) break;
    const current = byItem.get(String(item._id));

    if (current) {
      const topUp = Math.min(item.price - current.amountCovered, remaining);
      if (topUp <= 0) continue;
      current.amountCovered += topUp;
      current.status = current.amountCovered >= item.price ? 'PAID' : 'PARTIAL';
      if (payment) current.payment = payment._id;
      await current.save();
      remaining -= topUp;
      continue;
    }

    const amount = Math.min(item.price, remaining);
    if (amount <= 0) break;
    const doc = await UniformEntitlement.create({
      student: student._id,
      academicYear: academicYearId,
      term,
      uniformItem: item._id,
      name: item.name,
      price: item.price,
      amountCovered: amount,
      status: amount >= item.price ? 'PAID' : 'PARTIAL',
      payment: payment?._id || null,
    });
    created.push(doc);
    remaining -= amount;
  }

  return created;
}
