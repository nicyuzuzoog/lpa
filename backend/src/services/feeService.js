import FeeStructure from '../models/FeeStructure.js';
import Payment from '../models/Payment.js';
import Setting from '../models/Setting.js';
import UniformEntitlement from '../models/UniformEntitlement.js';
import UniformItem from '../models/UniformItem.js';

export function paymentStatusFor(required, paid) {
  if (paid <= 0) return 'UNPAID';
  if (paid < required) return 'PARTIALLY_PAID';
  if (paid === required) return 'PAID';
  return 'OVERPAID';
}

// Uniform is optional: a student who buys no uniform is not treated as owing.
export const OPTIONAL_FEE_TYPES = ['UNIFORM', 'MEALS'];

// Every student who eats at school owes this extra charge per term, on top of
// tuition and materials. Configurable via the `meal_fee_per_term` setting.
export const MEALS_FEE_PER_TERM_DEFAULT = 40000;

export async function mealsRequiredFor(student) {
  if (!student.eatsAtSchool) return 0;
  const value = await Setting.get('meal_fee_per_term', MEALS_FEE_PER_TERM_DEFAULT);
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : MEALS_FEE_PER_TERM_DEFAULT;
}

// Priority when allocating money a family has paid:
// meals first, then school supplies (materials), tuition last.
const ALLOCATION_ORDER = ['MEALS', 'MATERIALS', 'OTHER', 'SCHOOL_FEES'];

function allocateWaterfall(obligations, totalPaid) {
  const ordered = ALLOCATION_ORDER.map((t) => obligations.find((o) => o.feeType === t)).filter(Boolean);
  for (const o of obligations) if (!ordered.includes(o)) ordered.push(o);
  const result = {};
  let remaining = totalPaid;
  ordered.forEach((o, i) => {
    const applied = i === ordered.length - 1 ? remaining : Math.min(remaining, o.required);
    result[o.feeType] = applied;
    remaining -= applied;
  });
  return result;
}

async function obligationsFor(student) {
  const academicYearId = student.academicYear?._id || student.academicYear;
  const classId = student.class?._id || student.class;
  const [structures, mealsRequired] = await Promise.all([
    FeeStructure.find({
      academicYear: academicYearId,
      term: student.term,
      class: classId,
      status: 'ACTIVE',
      feeType: { $ne: 'MEALS' },
    }).populate('class', 'name').lean(),
    mealsRequiredFor(student),
  ]);
  const obligations = [];
  if (mealsRequired > 0) obligations.push({ feeType: 'MEALS', required: mealsRequired });
  for (const s of structures) {
    if (OPTIONAL_FEE_TYPES.includes(s.feeType)) continue; // uniform never joins the waterfall
    obligations.push({ feeType: s.feeType, required: s.requiredAmount });
  }
  return { structures, mealsRequired, obligations };
}

// How much of the family's money has been allocated to this fee type after
// applying the meals-first waterfall (uniform payments excluded).
export async function allocatedPaidFor(student, feeType, { excludePaymentId = null, extraAmount = 0 } = {}) {
  const academicYearId = student.academicYear?._id || student.academicYear;
  const match = {
    student: student._id,
    academicYear: academicYearId,
    term: student.term,
    status: 'ACTIVE',
    feeType: { $ne: 'UNIFORM' },
  };
  if (excludePaymentId) match._id = { $ne: excludePaymentId };

  const [{ obligations }, agg] = await Promise.all([
    obligationsFor(student),
    Payment.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  if (!obligations.some((o) => o.feeType === feeType)) return 0;
  const total = (agg[0]?.total || 0) + Number(extraAmount || 0);
  return allocateWaterfall(obligations, total)[feeType] || 0;
}

export async function getStudentFeeSummary(student, { feeType = null } = {}) {
  const academicYearId = student.academicYear?._id || student.academicYear;
  const { structures, mealsRequired, obligations } = await obligationsFor(student);

  const paidAgg = await Payment.aggregate([
    {
      $match: {
        student: student._id,
        academicYear: academicYearId,
        term: student.term,
        status: 'ACTIVE',
      },
    },
    { $group: { _id: '$feeType', paid: { $sum: '$amount' } } },
  ]);
  const paidMap = Object.fromEntries(paidAgg.map((p) => [p._id, p.paid]));
  const totalNonUniformPaid = Object.entries(paidMap)
    .filter(([type]) => type !== 'UNIFORM')
    .reduce((a, [, amount]) => a + amount, 0);
  const allocation = allocateWaterfall(obligations, totalNonUniformPaid);

  const rows = [];
  if ((!feeType || feeType === 'MEALS') && (mealsRequired > 0 || feeType === 'MEALS')) {
    const paid = allocation.MEALS || 0;
    rows.push({
      feeType: 'MEALS',
      required: mealsRequired,
      paid,
      balance: mealsRequired - paid,
      status: paymentStatusFor(mealsRequired, paid),
      className: structures[0]?.class?.name,
      optional: false,
    });
  }

  for (const s of structures) {
    if (feeType && s.feeType !== feeType) continue;
    // Uniform is tracked per its own payments (never part of the waterfall).
    const paid = s.feeType === 'UNIFORM' ? paidMap.UNIFORM || 0 : allocation[s.feeType] || 0;
    const required = s.requiredAmount;
    rows.push({
      feeType: s.feeType,
      required,
      paid,
      balance: required - paid,
      status: paymentStatusFor(required, paid),
      className: s.class?.name,
      optional: OPTIONAL_FEE_TYPES.includes(s.feeType),
    });
  }

  // Uniform never drives the student's core balance or overall status.
  const billable = rows.filter((r) => r.feeType !== 'UNIFORM');
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

// Batch version of getStudentFeeSummary for list endpoints: 3 queries total
// (setting + fee structures + one payments aggregate) instead of ~3 per student.
export async function batchFeeSummaries(students) {
  const result = new Map();
  if (!students.length) return result;

  const mealSetting = await Setting.get('meal_fee_per_term', MEALS_FEE_PER_TERM_DEFAULT);
  const mealsPerTerm = Number.isFinite(Number(mealSetting)) && Number(mealSetting) > 0 ? Number(mealSetting) : MEALS_FEE_PER_TERM_DEFAULT;

  const combos = new Map();
  for (const s of students) {
    const y = s.academicYear?._id || s.academicYear;
    const c = s.class?._id || s.class;
    if (!y || !c || !s.term) continue;
    combos.set(`${y}|${s.term}|${c}`, { academicYear: y, term: s.term, class: c });
  }

  const structures = combos.size
    ? await FeeStructure.find({
        status: 'ACTIVE',
        feeType: { $ne: 'MEALS' },
        $or: [...combos.values()],
      }).populate('class', 'name').lean()
    : [];

  const structsByKey = new Map();
  for (const st of structures) {
    const key = `${st.academicYear}|${st.term}|${st.class?._id || st.class}`;
    if (!structsByKey.has(key)) structsByKey.set(key, []);
    structsByKey.get(key).push(st);
  }

  const paidAgg = await Payment.aggregate([
    { $match: { student: { $in: students.map((s) => s._id) }, status: 'ACTIVE' } },
    { $group: { _id: { student: '$student', academicYear: '$academicYear', term: '$term', feeType: '$feeType' }, paid: { $sum: '$amount' } } },
  ]);
  const paidByStudent = new Map();
  for (const p of paidAgg) {
    const key = `${p._id.student}|${p._id.academicYear}|${p._id.term}`;
    if (!paidByStudent.has(key)) paidByStudent.set(key, {});
    const m = paidByStudent.get(key);
    m[p._id.feeType] = (m[p._id.feeType] || 0) + p.paid;
  }

  for (const s of students) {
    const y = s.academicYear?._id || s.academicYear;
    const c = s.class?._id || s.class;
    const sts = structsByKey.get(`${y}|${s.term}|${c}`) || [];
    const mealsRequired = s.eatsAtSchool ? mealsPerTerm : 0;

    const obligations = [];
    if (mealsRequired > 0) obligations.push({ feeType: 'MEALS', required: mealsRequired });
    for (const st of sts) {
      if (OPTIONAL_FEE_TYPES.includes(st.feeType)) continue;
      obligations.push({ feeType: st.feeType, required: st.requiredAmount });
    }

    const paidMap = paidByStudent.get(`${s._id}|${y}|${s.term}`) || {};
    const totalNonUniformPaid = Object.entries(paidMap)
      .filter(([type]) => type !== 'UNIFORM')
      .reduce((a, [, amount]) => a + amount, 0);
    const allocation = allocateWaterfall(obligations, totalNonUniformPaid);

    const rows = [];
    if (mealsRequired > 0) {
      const paid = allocation.MEALS || 0;
      rows.push({
        feeType: 'MEALS',
        required: mealsRequired,
        paid,
        balance: mealsRequired - paid,
        status: paymentStatusFor(mealsRequired, paid),
        className: sts[0]?.class?.name,
        optional: false,
      });
    }
    for (const st of sts) {
      const paid = st.feeType === 'UNIFORM' ? paidMap.UNIFORM || 0 : allocation[st.feeType] || 0;
      rows.push({
        feeType: st.feeType,
        required: st.requiredAmount,
        paid,
        balance: st.requiredAmount - paid,
        status: paymentStatusFor(st.requiredAmount, paid),
        className: st.class?.name,
        optional: OPTIONAL_FEE_TYPES.includes(st.feeType),
      });
    }

    const billable = rows.filter((r) => r.feeType !== 'UNIFORM');
    const required = billable.reduce((a, r) => a + r.required, 0);
    const paid = billable.reduce((a, r) => a + r.paid, 0);

    result.set(String(s._id), {
      rows,
      totalRequired: required,
      totalPaid: paid,
      totalBalance: required - paid,
      overallStatus: required === 0 ? 'UNPAID' : paymentStatusFor(required, paid),
    });
  }

  return result;
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
