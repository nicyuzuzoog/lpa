import mongoose from 'mongoose';

const termSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' },
  },
  { _id: true }
);

const academicYearSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: false },
    terms: { type: [termSchema], default: () => [{ name: 'Term 1' }, { name: 'Term 2' }, { name: 'Term 3' }] },
  },
  { timestamps: true }
);

export default mongoose.model('AcademicYear', academicYearSchema);
