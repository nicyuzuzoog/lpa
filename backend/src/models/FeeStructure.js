import mongoose from 'mongoose';

export const FEE_TYPES = ['SCHOOL_FEES', 'MATERIALS', 'UNIFORM', 'MEALS', 'OTHER'];

const feeStructureSchema = new mongoose.Schema(
  {
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    term: { type: String, required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    feeType: { type: String, enum: FEE_TYPES, required: true },
    requiredAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

feeStructureSchema.index({ academicYear: 1, term: 1, class: 1, feeType: 1 }, { unique: true });

export default mongoose.model('FeeStructure', feeStructureSchema);
