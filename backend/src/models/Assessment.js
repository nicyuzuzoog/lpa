import mongoose from 'mongoose';
import { SUBJECT_CODES } from '../constants/subjects.js';

export const ASSESSMENT_STATUSES = ['OPEN', 'CLOSED'];
export const PASS_PERCENTAGE = 50;

const markSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    // null = not graded yet.
    score: { type: Number, default: null, min: 0 },
    remark: { type: String, trim: true, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Assessment title is required'], trim: true },
    subject: { type: String, enum: SUBJECT_CODES, required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
    term: { type: String, default: '' },
    // Total marks for this assessment (e.g. 40).
    maxMarks: { type: Number, required: true, min: 1, max: 100 },
    passMark: { type: Number, min: 0 },
    assessmentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ASSESSMENT_STATUSES, default: 'OPEN' },
    marks: { type: [markSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

assessmentSchema.index({ class: 1, subject: 1, academicYear: 1, term: 1 });
assessmentSchema.index({ createdBy: 1 });

assessmentSchema.virtual('passMarkValue').get(function () {
  return this.passMark != null ? this.passMark : Math.ceil(this.maxMarks * (PASS_PERCENTAGE / 100));
});

assessmentSchema.set('toJSON', { virtuals: true });
assessmentSchema.set('toObject', { virtuals: true });

export default mongoose.model('Assessment', assessmentSchema);
