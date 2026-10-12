import mongoose from 'mongoose';

const uniformEntitlementSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    term: { type: String, required: true },
    uniformItem: { type: mongoose.Schema.Types.ObjectId, ref: 'UniformItem', required: true },
    name: String,
    price: { type: Number, required: true },
    amountCovered: { type: Number, default: 0 },
    status: { type: String, enum: ['PAID', 'PARTIAL'], default: 'PAID' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true }
);

uniformEntitlementSchema.index({ student: 1, academicYear: 1, term: 1, uniformItem: 1 }, { unique: true });

export default mongoose.model('UniformEntitlement', uniformEntitlementSchema);
