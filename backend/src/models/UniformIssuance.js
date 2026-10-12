import mongoose from 'mongoose';

const uniformIssuanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    term: { type: String, required: true },
    items: [
      {
        uniformItem: { type: mongoose.Schema.Types.ObjectId, ref: 'UniformItem', required: true },
        name: String,
        size: String,
        gender: String,
        quantity: { type: Number, default: 1, min: 1 },
        amount: { type: Number, default: 0 },
      },
    ],
    status: { type: String, enum: ['ISSUED', 'RETURNED', 'PARTIALLY_RETURNED'], default: 'ISSUED' },
    notes: { type: String, default: '' },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

uniformIssuanceSchema.index({ student: 1, academicYear: 1, term: 1 });

export default mongoose.model('UniformIssuance', uniformIssuanceSchema);
