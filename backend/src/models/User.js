import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { SUBJECT_CODES } from '../constants/subjects.js';

export const ROLES = ['SUPER_ADMIN', 'ACCOUNTANT', 'BIG_BOSS', 'TEACHER'];

const teachingAssignmentSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    subject: { type: String, enum: SUBJECT_CODES, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, 'Full name is required'], trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: null },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'ACCOUNTANT' },
    status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE' },
    // A teacher is the "class reader" (homeroom / class teacher) of exactly one class.
    classTeacherOf: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: undefined },
    // A teacher may teach many classes and many subjects.
    teachingAssignments: { type: [teachingAssignmentSchema], default: [] },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    username: this.username,
    email: this.email,
    role: this.role,
    status: this.status,
    classTeacherOf: this.classTeacherOf || null,
    teachingAssignments: (this.teachingAssignments || []).map((a) => ({
      class: a.class,
      subject: a.subject,
    })),
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
