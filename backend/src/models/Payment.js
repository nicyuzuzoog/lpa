import mongoose from 'mongoose';

export const PAYMENT_METHODS = ['CASH', 'BANK', 'MOBILE_MONEY', 'OTHER'];
export const PAYMENT_STATUSES = ['ACTIVE', 'REVERSED', 'VOID'];

const paymentSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    term: { type: String, required: true },
    feeType: { type: String, enum: ['SCHOOL_FEES', 'MATERIALS', 'UNIFORM', 'OTHER'], required: true },
    amount: { type: Number, required: true, min: [1, 'Payment amount must be greater than zero'] },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentDate: { type: Date, required: true, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'ACTIVE' },
    balanceBefore: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ student: 1, academicYear: 1, term: 1, feeType: 1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ status: 1 });

export default mongoose.model('Payment', paymentSchema);
