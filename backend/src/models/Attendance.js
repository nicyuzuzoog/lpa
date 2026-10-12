import mongoose from 'mongoose';

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE'];

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
    term: { type: String, default: '' },
    // Stored as midnight UTC so one record exists per student per day.
    date: { type: Date, required: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    // Required whenever a student is marked ABSENT.
    reason: { type: String, trim: true, default: '' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    markedByName: { type: String, default: '' },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ class: 1, date: 1 });

export default mongoose.model('Attendance', attendanceSchema);
