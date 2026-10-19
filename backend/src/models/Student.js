import mongoose from 'mongoose';

export const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED'];

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['MALE', 'FEMALE'], required: true },
    dateOfBirth: { type: Date, default: null },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    term: { type: String, required: true },
    status: { type: String, enum: STUDENT_STATUSES, default: 'ACTIVE' },
    eatsAtSchool: { type: Boolean, default: false },
    // Per-student fee overrides (discounts). When a value is set it replaces
    // the class fee-structure amount for that fee type; null = standard amount.
    // Example: a child who pays less for supplies has MATERIALS set (e.g. 20000
    // instead of the class amount of 30000/35000).
    feeOverrides: {
      SCHOOL_FEES: { type: Number, default: null, min: 0 },
      MATERIALS: { type: Number, default: null, min: 0 },
      MEALS: { type: Number, default: null, min: 0 },
      UNIFORM: { type: Number, default: null, min: 0 },
      OTHER: { type: Number, default: null, min: 0 },
    },
    motherPhone: { type: String, trim: true, default: '' },
    fatherPhone: { type: String, trim: true, default: '' },
    photo: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

studentSchema.index({ class: 1 });
studentSchema.index({ academicYear: 1, term: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ firstName: 'text', lastName: 'text' });

studentSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

export default mongoose.model('Student', studentSchema);
