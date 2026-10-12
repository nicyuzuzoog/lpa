import mongoose from 'mongoose';
import Student from '../models/Student.js';
import SchoolClass from '../models/SchoolClass.js';
import AcademicYear from '../models/AcademicYear.js';
import User from '../models/User.js';
import Attendance, { ATTENDANCE_STATUSES } from '../models/Attendance.js';
import Assessment, { PASS_PERCENTAGE } from '../models/Assessment.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { recordAudit } from '../services/auditService.js';
import { SUBJECTS, SUBJECT_CODES, subjectLabel } from '../constants/subjects.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function normalizeDate(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid date');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isTeacher(user) {
  return user.role === 'TEACHER';
}

function managedClassIds(user) {
  const ids = new Set();
  if (user.classTeacherOf) ids.add(String(user.classTeacherOf));
  for (const a of user.teachingAssignments || []) if (a.class) ids.add(String(a.class));
  return [...ids];
}

function idOf(value) {
  return String(value?._id || value || '');
}

function canTeach(user, classId, subject) {
  if (user.role === 'SUPER_ADMIN') return true;
  const cid = idOf(classId);
  return (user.teachingAssignments || []).some(
    (a) => idOf(a.class) === cid && a.subject === subject
  );
}

function teacherCanManageAssessment(user, assessment) {
  if (user.role === 'SUPER_ADMIN') return true;
  return canTeach(user, assessment.class, assessment.subject);
}

function isHomeroomTeacher(user, classId) {
  if (!classId) return false;
  return String(user.classTeacherOf || '') === String(classId);
}

async function getActiveAcademicYear() {
  return AcademicYear.findOne({ isActive: true });
}

function buildAssessmentReport(assessment, students) {
  const max = assessment.maxMarks;
  const passMark =
    assessment.passMark != null ? assessment.passMark : Math.ceil(max * (PASS_PERCENTAGE / 100));
  const markByStudent = new Map(assessment.marks.map((m) => [String(m.student), m]));

  const rows = students.map((s) => {
    const m = markByStudent.get(String(s._id));
    const score = m && m.score != null ? m.score : null;
    const percentage = score == null ? null : Math.round((score / max) * 1000) / 10;
    const passed = score == null ? null : score >= passMark;
    return {
      student: {
        _id: s._id,
        studentId: s.studentId,
        fullName: `${s.firstName} ${s.lastName}`,
      },
      score,
      percentage,
      passed,
      remark: m?.remark || '',
    };
  });

  const graded = rows.filter((r) => r.score != null);
  const passed = graded.filter((r) => r.passed);
  const sum = graded.reduce((a, r) => a + r.score, 0);
  const average = graded.length ? Math.round((sum / graded.length) * 100) / 100 : 0;
  const averagePct = graded.length ? Math.round((sum / (graded.length * max)) * 1000) / 10 : 0;

  const sorted = [...graded].sort((a, b) => b.score - a.score);
  sorted.forEach((r, i) => {
    r.position = i + 1;
  });

  return {
    maxMarks: max,
    passMark,
    passPercentage: PASS_PERCENTAGE,
    rows,
    summary: {
      totalStudents: students.length,
      graded: graded.length,
      ungraded: rows.length - graded.length,
      passed: passed.length,
      failed: graded.length - passed.length,
      passRate: graded.length ? Math.round((passed.length / graded.length) * 1000) / 10 : 0,
      average,
      averagePct,
      highest: sorted[0]?.score ?? null,
      lowest: sorted[sorted.length - 1]?.score ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Teaching profile
// ---------------------------------------------------------------------------

export const getMyTeaching = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!isTeacher(user)) {
    const classes = await SchoolClass.find({ status: 'ACTIVE' }).sort({ order: 1, name: 1 });
    return res.json({
      success: true,
      isTeacher: false,
      homeroom: null,
      assignments: [],
      classes: classes.map((c) => ({
        _id: c._id,
        name: c.name,
        subjects: SUBJECT_CODES,
        isHomeroom: false,
      })),
      subjects: SUBJECTS,
    });
  }

  const homeroom = user.classTeacherOf ? await SchoolClass.findById(user.classTeacherOf) : null;
  const classDocs = await SchoolClass.find({ _id: { $in: managedClassIds(user) } }).sort({
    order: 1,
    name: 1,
  });

  const classes = classDocs.map((c) => ({
    _id: c._id,
    name: c.name,
    subjects: (user.teachingAssignments || [])
      .filter((a) => String(a.class) === String(c._id))
      .map((a) => a.subject),
    isHomeroom: String(user.classTeacherOf) === String(c._id),
  }));

  res.json({
    success: true,
    isTeacher: true,
    homeroom: homeroom ? { _id: homeroom._id, name: homeroom.name } : null,
    assignments: (user.teachingAssignments || []).map((a) => ({
      class: a.class,
      subject: a.subject,
      subjectName: subjectLabel(a.subject),
    })),
    classes,
    subjects: SUBJECTS,
  });
});

export const getClassStudents = asyncHandler(async (req, res) => {
  const classId = req.params.id;
  if (!mongoose.isValidObjectId(classId)) throw new ApiError(400, 'Invalid class');

  if (isTeacher(req.user) && !managedClassIds(req.user).includes(String(classId))) {
    throw new ApiError(403, 'You can only view classes you teach');
  }

  const cls = await SchoolClass.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');

  const students = await Student.find({ class: classId, status: 'ACTIVE' }).sort({
    firstName: 1,
    lastName: 1,
  });

  res.json({ success: true, class: { _id: cls._id, name: cls.name }, items: students });
});

// ---------------------------------------------------------------------------
// Attendance (homeroom / class-reader class only)
// ---------------------------------------------------------------------------

export const getAttendanceSheet = asyncHandler(async (req, res) => {
  const classId = req.query.class || req.user.classTeacherOf;
  if (!classId || !mongoose.isValidObjectId(classId)) throw new ApiError(400, 'A class is required');

  if (isTeacher(req.user) && !isHomeroomTeacher(req.user, classId)) {
    throw new ApiError(403, 'Attendance can only be taken for your class-reader class');
  }

  const date = normalizeDate(req.query.date || new Date());
  const cls = await SchoolClass.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');

  const [students, records] = await Promise.all([
    Student.find({ class: classId, status: 'ACTIVE' }).sort({ firstName: 1, lastName: 1 }),
    Attendance.find({ class: classId, date }),
  ]);

  const byStudent = new Map(records.map((r) => [String(r.student), r]));
  const rows = students.map((s) => {
    const rec = byStudent.get(String(s._id));
    return {
      _id: s._id,
      studentId: s.studentId,
      fullName: `${s.firstName} ${s.lastName}`,
      status: rec?.status || '',
      reason: rec?.reason || '',
      marked: !!rec,
    };
  });

  const summary = {
    total: rows.length,
    present: rows.filter((r) => r.status === 'PRESENT').length,
    absent: rows.filter((r) => r.status === 'ABSENT').length,
    late: rows.filter((r) => r.status === 'LATE').length,
    unmarked: rows.filter((r) => !r.status).length,
  };

  res.json({
    success: true,
    class: { _id: cls._id, name: cls.name },
    date,
    items: rows,
    summary,
  });
});

export const saveAttendance = asyncHandler(async (req, res) => {
  const { class: classId, date: rawDate, records, term, academicYear } = req.body;
  if (!classId || !mongoose.isValidObjectId(classId)) throw new ApiError(400, 'A class is required');
  if (!Array.isArray(records) || !records.length) throw new ApiError(400, 'No attendance rows to save');

  if (isTeacher(req.user) && !isHomeroomTeacher(req.user, classId)) {
    throw new ApiError(403, 'Attendance can only be taken for your class-reader class');
  }

  const date = normalizeDate(rawDate || new Date());
  if (date.getTime() > startOfTodayUTC().getTime()) {
    throw new ApiError(400, 'Attendance cannot be recorded for a future date');
  }

  const cls = await SchoolClass.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');

  const students = await Student.find({ class: classId, status: 'ACTIVE' }).select('_id firstName lastName');
  const validIds = new Set(students.map((s) => String(s._id)));

  const seen = new Set();
  const ops = [];

  for (const rec of records) {
    const studentId = rec?.student;
    if (!studentId || !validIds.has(String(studentId))) {
      throw new ApiError(400, 'One of the selected students is not in this class');
    }
    if (seen.has(String(studentId))) throw new ApiError(400, 'Duplicate student in attendance list');
    seen.add(String(studentId));

    const status = String(rec.status || '').toUpperCase();
    if (!ATTENDANCE_STATUSES.includes(status)) throw new ApiError(400, 'Invalid attendance status');

    const reason = String(rec.reason || '').trim();
    if (status === 'ABSENT' && reason.length < 3) {
      throw new ApiError(400, 'A reason is required for every absent student (at least 3 characters)');
    }

    ops.push({
      updateOne: {
        filter: { student: studentId, date },
        update: {
          $set: {
            student: studentId,
            class: classId,
            date,
            status,
            reason: status === 'ABSENT' ? reason : '',
            term: term || '',
            academicYear: academicYear || null,
            markedBy: req.user._id,
            markedByName: req.user.fullName,
          },
        },
        upsert: true,
      },
    });
  }

  await Attendance.bulkWrite(ops);

  const summary = {
    present: records.filter((r) => r.status === 'PRESENT').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    late: records.filter((r) => r.status === 'LATE').length,
  };

  await recordAudit({
    user: req.user,
    action: 'SAVE',
    module: 'ATTENDANCE',
    recordId: classId,
    recordLabel: `${cls.name} - ${date.toISOString().slice(0, 10)}`,
    newValue: summary,
    reason: 'Daily attendance saved',
  });

  res.json({ success: true, message: `Attendance saved for ${cls.name}`, summary });
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const classId = req.query.class || req.user.classTeacherOf;
  if (!classId || !mongoose.isValidObjectId(classId)) throw new ApiError(400, 'A class is required');

  if (isTeacher(req.user) && !isHomeroomTeacher(req.user, classId)) {
    throw new ApiError(403, 'Attendance can only be viewed for your class-reader class');
  }

  const cls = await SchoolClass.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');

  const [students, records] = await Promise.all([
    Student.find({ class: classId, status: 'ACTIVE' }).sort({ firstName: 1, lastName: 1 }),
    Attendance.find({ class: classId }).select('student status'),
  ]);

  const rows = students.map((s) => {
    const mine = records.filter((r) => String(r.student) === String(s._id));
    const present = mine.filter((r) => r.status === 'PRESENT').length;
    const absent = mine.filter((r) => r.status === 'ABSENT').length;
    const late = mine.filter((r) => r.status === 'LATE').length;
    const days = mine.length;
    return {
      _id: s._id,
      studentId: s.studentId,
      fullName: `${s.firstName} ${s.lastName}`,
      days,
      present,
      absent,
      late,
      rate: days ? Math.round(((present + late) / days) * 1000) / 10 : 0,
    };
  });

  res.json({ success: true, class: { _id: cls._id, name: cls.name }, items: rows });
});

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

async function loadAssessmentOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid assessment');
  const assessment = await Assessment.findById(id).populate('class', 'name').populate('createdBy', 'fullName');
  if (!assessment) throw new ApiError(404, 'Assessment not found');
  return assessment;
}

export const listAssessments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.class) filter.class = req.query.class;
  if (req.query.subject) filter.subject = req.query.subject;
  if (req.query.term) filter.term = req.query.term;

  if (isTeacher(req.user)) {
    const mine = managedClassIds(req.user);
    if (!mine.length) return res.json({ success: true, items: [], total: 0 });
    if (filter.class) {
      if (!mine.includes(String(filter.class))) return res.json({ success: true, items: [], total: 0 });
    } else {
      filter.class = { $in: mine };
    }
  }

  const items = await Assessment.find(filter)
    .populate('class', 'name')
    .populate('createdBy', 'fullName')
    .sort('-assessmentDate -createdAt')
    .limit(300);

  const shaped = items.map((a) => ({
    _id: a._id,
    title: a.title,
    subject: a.subject,
    subjectName: subjectLabel(a.subject),
    class: a.class,
    term: a.term,
    maxMarks: a.maxMarks,
    passMark: a.passMarkValue,
    assessmentDate: a.assessmentDate,
    status: a.status,
    graded: a.marks.filter((m) => m.score != null).length,
    totalMarks: a.marks.length,
    createdByName: a.createdBy?.fullName || '',
  }));

  res.json({ success: true, items: shaped, total: shaped.length });
});

export const createAssessment = asyncHandler(async (req, res) => {
  const { title, subject, class: classId, maxMarks, term, academicYear, assessmentDate, passMark } = req.body;

  if (!title || !String(title).trim()) throw new ApiError(400, 'Assessment title is required');
  if (!SUBJECT_CODES.includes(subject)) throw new ApiError(400, 'Invalid subject');
  if (!classId || !mongoose.isValidObjectId(classId)) throw new ApiError(400, 'A class is required');

  const max = Number(maxMarks);
  if (!Number.isInteger(max) || max < 1 || max > 100) {
    throw new ApiError(400, 'Total marks must be a whole number between 1 and 100');
  }

  const cls = await SchoolClass.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');

  if (!canTeach(req.user, classId, subject)) {
    throw new ApiError(403, `You are not assigned to teach ${subjectLabel(subject)} in ${cls.name}`);
  }

  let pass = null;
  if (passMark !== undefined && passMark !== null && passMark !== '') {
    pass = Number(passMark);
    if (!Number.isInteger(pass) || pass < 0 || pass > max) {
      throw new ApiError(400, 'Pass mark must be a whole number between 0 and the total marks');
    }
  }

  let year = academicYear || null;
  let termValue = term || '';
  if (!year) {
    const active = await getActiveAcademicYear();
    if (active) {
      year = active._id;
      if (!termValue) termValue = active.terms?.find((t) => t.status === 'ACTIVE')?.name || '';
    }
  }

  const dup = await Assessment.findOne({
    title: String(title).trim(),
    class: classId,
    subject,
    term: termValue,
    academicYear: year,
  });
  if (dup) throw new ApiError(409, 'An assessment with this title already exists for this class and subject');

  const assessment = await Assessment.create({
    title: String(title).trim(),
    subject,
    class: classId,
    academicYear: year,
    term: termValue,
    maxMarks: max,
    passMark: pass,
    assessmentDate: assessmentDate ? normalizeDate(assessmentDate) : new Date(),
    status: 'OPEN',
    createdBy: req.user._id,
  });

  await recordAudit({
    user: req.user,
    action: 'CREATE',
    module: 'ASSESSMENTS',
    recordId: assessment._id,
    recordLabel: `${assessment.title} (${cls.name} - ${subjectLabel(subject)})`,
    newValue: { title: assessment.title, subject, class: cls.name, maxMarks: max },
  });

  const populated = await assessment.populate('class', 'name');
  res.status(201).json({ success: true, item: populated });
});

export const getAssessment = asyncHandler(async (req, res) => {
  const assessment = await loadAssessmentOr404(req.params.id);
  if (!teacherCanManageAssessment(req.user, assessment)) {
    throw new ApiError(403, 'You do not have access to this assessment');
  }

  const students = await Student.find({ class: assessment.class._id, status: 'ACTIVE' }).sort({
    firstName: 1,
    lastName: 1,
  });

  const report = buildAssessmentReport(assessment, students);

  res.json({
    success: true,
    item: {
      _id: assessment._id,
      title: assessment.title,
      subject: assessment.subject,
      subjectName: subjectLabel(assessment.subject),
      class: assessment.class,
      term: assessment.term,
      maxMarks: assessment.maxMarks,
      passMark: assessment.passMarkValue,
      assessmentDate: assessment.assessmentDate,
      status: assessment.status,
      createdByName: assessment.createdBy?.fullName || '',
    },
    students: students.map((s) => ({
      _id: s._id,
      studentId: s.studentId,
      fullName: `${s.firstName} ${s.lastName}`,
    })),
    report,
  });
});

export const updateAssessment = asyncHandler(async (req, res) => {
  const assessment = await loadAssessmentOr404(req.params.id);
  if (!teacherCanManageAssessment(req.user, assessment)) {
    throw new ApiError(403, 'You do not have access to this assessment');
  }

  const { title, maxMarks, passMark, assessmentDate, status, term } = req.body;

  if (title !== undefined) {
    if (!String(title).trim()) throw new ApiError(400, 'Assessment title cannot be empty');
    assessment.title = String(title).trim();
  }

  if (maxMarks !== undefined) {
    const max = Number(maxMarks);
    if (!Number.isInteger(max) || max < 1 || max > 100) {
      throw new ApiError(400, 'Total marks must be a whole number between 1 and 100');
    }
    const tooHigh = assessment.marks.find((m) => m.score != null && m.score > max);
    if (tooHigh) throw new ApiError(400, 'Cannot reduce total marks below an existing score');
    assessment.maxMarks = max;
    if (assessment.passMark != null && assessment.passMark > max) {
      throw new ApiError(400, 'Pass mark is higher than the new total marks');
    }
  }

  if (passMark !== undefined) {
    if (passMark === null || passMark === '') {
      assessment.passMark = undefined;
    } else {
      const p = Number(passMark);
      if (!Number.isInteger(p) || p < 0 || p > assessment.maxMarks) {
        throw new ApiError(400, 'Pass mark must be a whole number between 0 and the total marks');
      }
      assessment.passMark = p;
    }
  }

  if (assessmentDate !== undefined) assessment.assessmentDate = normalizeDate(assessmentDate);
  if (term !== undefined) assessment.term = term;

  if (status !== undefined) {
    if (!['OPEN', 'CLOSED'].includes(status)) throw new ApiError(400, 'Invalid status');
    if (status === 'OPEN' && req.user.role !== 'SUPER_ADMIN' && assessment.status === 'CLOSED') {
      throw new ApiError(403, 'Only the Super Admin can reopen a closed assessment');
    }
    assessment.status = status;
  }

  await assessment.save();
  await recordAudit({
    user: req.user,
    action: 'UPDATE',
    module: 'ASSESSMENTS',
    recordId: assessment._id,
    recordLabel: assessment.title,
    newValue: { title: assessment.title, maxMarks: assessment.maxMarks, status: assessment.status },
  });

  const populated = await assessment.populate('class', 'name');
  res.json({ success: true, item: populated });
});

export const saveMarks = asyncHandler(async (req, res) => {
  const assessment = await loadAssessmentOr404(req.params.id);
  if (!teacherCanManageAssessment(req.user, assessment)) {
    throw new ApiError(403, 'You do not have access to this assessment');
  }
  if (assessment.status === 'CLOSED' && req.user.role !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'This assessment is closed. Ask the Super Admin to reopen it.');
  }

  const { marks } = req.body;
  if (!Array.isArray(marks)) throw new ApiError(400, 'Marks must be an array');

  const classId = assessment.class?._id || assessment.class;
  const students = await Student.find({ class: classId, status: 'ACTIVE' }).select('_id');
  const validIds = new Set(students.map((s) => String(s._id)));
  const max = assessment.maxMarks;

  const incoming = new Map();
  for (const entry of marks) {
    const studentId = String(entry?.student || '');
    if (!validIds.has(studentId)) throw new ApiError(400, 'One of the marks is for a student outside this class');
    if (incoming.has(studentId)) throw new ApiError(400, 'Duplicate student in the marks list');

    const raw = entry.score;
    let score = null;
    if (raw !== null && raw !== undefined && raw !== '') {
      score = Number(raw);
      if (!Number.isFinite(score)) throw new ApiError(400, 'Marks must be numbers');
      if (!Number.isInteger(score)) throw new ApiError(400, 'Marks must be whole numbers (no worked marks)');
      if (score < 0) throw new ApiError(400, 'Marks cannot be negative');
      if (score > max) throw new ApiError(400, `Marks cannot exceed the total of ${max}`);
    }

    const remark = String(entry.remark || '').trim();
    if (remark.length > 200) throw new ApiError(400, 'Remark is too long (max 200 characters)');
    incoming.set(studentId, { score, remark });
  }

  // Merge with existing marks, removing any that were cleared.
  const nextMarks = [];
  const existing = new Map(assessment.marks.map((m) => [String(m.student), m]));
  const allStudentIds = new Set([...existing.keys(), ...incoming.keys()]);

  for (const sid of allStudentIds) {
    const update = incoming.has(sid) ? incoming.get(sid) : null;
    const prev = existing.get(sid);
    const score = update ? update.score : prev?.score ?? null;
    const remark = update ? update.remark : prev?.remark || '';
    if (score == null && !remark) continue; // drop empty entries
    nextMarks.push({
      student: sid,
      score,
      remark,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });
  }

  assessment.marks = nextMarks;
  await assessment.save();

  const graded = nextMarks.filter((m) => m.score != null).length;
  await recordAudit({
    user: req.user,
    action: 'MARKS',
    module: 'ASSESSMENTS',
    recordId: assessment._id,
    recordLabel: assessment.title,
    newValue: { graded, total: nextMarks.length, maxMarks: max },
    reason: 'Marks entered',
  });

  const roster = await Student.find({ class: classId, status: 'ACTIVE' }).sort({
    firstName: 1,
    lastName: 1,
  });
  const report = buildAssessmentReport(assessment, roster);
  res.json({ success: true, message: 'Marks saved', report });
});

export const getAssessmentReport = asyncHandler(async (req, res) => {
  const assessment = await loadAssessmentOr404(req.params.id);
  if (!teacherCanManageAssessment(req.user, assessment)) {
    throw new ApiError(403, 'You do not have access to this assessment');
  }
  const students = await Student.find({ class: assessment.class._id, status: 'ACTIVE' }).sort({
    firstName: 1,
    lastName: 1,
  });
  const report = buildAssessmentReport(assessment, students);
  res.json({
    success: true,
    assessment: {
      _id: assessment._id,
      title: assessment.title,
      subjectName: subjectLabel(assessment.subject),
      className: assessment.class?.name || '',
      term: assessment.term,
      maxMarks: assessment.maxMarks,
      assessmentDate: assessment.assessmentDate,
    },
    report,
  });
});

export const getClassReport = asyncHandler(async (req, res) => {
  const classId = req.query.class;
  if (!classId || !mongoose.isValidObjectId(classId)) throw new ApiError(400, 'A class is required');
  if (isTeacher(req.user) && !managedClassIds(req.user).includes(String(classId))) {
    throw new ApiError(403, 'You can only report on classes you teach');
  }

  const cls = await SchoolClass.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');

  const filter = { class: classId };
  if (req.query.subject) filter.subject = req.query.subject;
  if (req.query.term) filter.term = req.query.term;

  const assessments = await Assessment.find(filter).sort({ assessmentDate: 1, createdAt: 1 });
  const students = await Student.find({ class: classId, status: 'ACTIVE' }).sort({
    firstName: 1,
    lastName: 1,
  });

  const rows = students.map((s) => {
    let obtained = 0;
    let totalMax = 0;
    const scores = {};
    for (const a of assessments) {
      const m = a.marks.find((x) => String(x.student) === String(s._id));
      const score = m && m.score != null ? m.score : null;
      scores[String(a._id)] = score;
      if (score != null) {
        obtained += score;
        totalMax += a.maxMarks;
      }
    }
    const percentage = totalMax ? Math.round((obtained / totalMax) * 1000) / 10 : null;
    const passed = percentage == null ? null : percentage >= PASS_PERCENTAGE;
    return {
      student: { _id: s._id, studentId: s.studentId, fullName: `${s.firstName} ${s.lastName}` },
      scores,
      obtained,
      totalMax,
      percentage,
      passed,
    };
  });

  const ranked = [...rows].filter((r) => r.percentage != null).sort((a, b) => b.percentage - a.percentage);
  ranked.forEach((r, i) => {
    r.position = i + 1;
  });
  const positionById = new Map(ranked.map((r) => [String(r.student._id), r.position]));
  rows.forEach((r) => {
    r.position = positionById.get(String(r.student._id)) ?? null;
  });

  const withPct = rows.filter((r) => r.percentage != null);
  const summary = {
    totalStudents: students.length,
    graded: withPct.length,
    passed: withPct.filter((r) => r.passed).length,
    failed: withPct.filter((r) => !r.passed).length,
    passRate: withPct.length ? Math.round((withPct.filter((r) => r.passed).length / withPct.length) * 1000) / 10 : 0,
    averagePct: withPct.length
      ? Math.round((withPct.reduce((a, r) => a + r.percentage, 0) / withPct.length) * 10) / 10
      : 0,
  };

  res.json({
    success: true,
    class: { _id: cls._id, name: cls.name },
    assessments: assessments.map((a) => ({
      _id: a._id,
      title: a.title,
      subject: a.subject,
      subjectName: subjectLabel(a.subject),
      maxMarks: a.maxMarks,
      assessmentDate: a.assessmentDate,
    })),
    rows,
    summary,
  });
});

// ---------------------------------------------------------------------------
// Class subject -> teacher assignments (class + subject per teacher)
// ---------------------------------------------------------------------------

async function assignmentsForClass(classId) {
  const teachers = await User.find({ role: 'TEACHER', status: 'ACTIVE' })
    .select('fullName username teachingAssignments')
    .sort('fullName');
  const bySubject = new Map();
  for (const t of teachers) {
    for (const a of t.teachingAssignments || []) {
      if (String(a.class) === String(classId)) {
        bySubject.set(a.subject, { subject: a.subject, teacher: { _id: t._id, fullName: t.fullName } });
      }
    }
  }
  return [...bySubject.values()];
}

export const getClassAssignments = asyncHandler(async (req, res) => {
  const classId = req.query.class || req.params.id;
  if (!classId || !mongoose.isValidObjectId(classId)) throw new ApiError(400, 'A valid class is required');
  const cls = await SchoolClass.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');

  const teachers = await User.find({ role: 'TEACHER', status: 'ACTIVE' })
    .select('fullName username')
    .sort('fullName');

  res.json({
    success: true,
    class: { _id: cls._id, name: cls.name },
    teachers: teachers.map((t) => ({ _id: t._id, fullName: t.fullName, username: t.username })),
    assignments: await assignmentsForClass(classId),
  });
});

export const setClassAssignment = asyncHandler(async (req, res) => {
  const { class: classId, subject, teacher } = req.body || {};
  if (!classId || !mongoose.isValidObjectId(classId)) throw new ApiError(400, 'A valid class is required');
  const cls = await SchoolClass.findById(classId);
  if (!cls) throw new ApiError(404, 'Class not found');
  if (!SUBJECT_CODES.includes(subject)) throw new ApiError(400, 'A valid subject is required');

  // One teacher per class + subject: clear this pair from every teacher first.
  await User.updateMany(
    { role: 'TEACHER' },
    { $pull: { teachingAssignments: { class: classId, subject } } }
  );

  let assigned = null;
  if (teacher) {
    if (!mongoose.isValidObjectId(teacher)) throw new ApiError(400, 'Invalid teacher');
    const t = await User.findOne({ _id: teacher, role: 'TEACHER' });
    if (!t) throw new ApiError(404, 'Teacher not found');
    t.teachingAssignments = [
      ...(t.teachingAssignments || []).filter(
        (a) => !(String(a.class) === String(classId) && a.subject === subject)
      ),
      { class: classId, subject },
    ];
    await t.save();
    assigned = t.fullName;
  }

  await recordAudit({
    user: req.user,
    action: 'UPDATE',
    module: 'TEACHERS',
    recordId: classId,
    recordLabel: `${cls.name} - ${subjectLabel(subject)}`,
    newValue: { class: cls.name, subject, teacher: assigned },
    reason: assigned ? 'Class subject teacher assigned' : 'Class subject teacher cleared',
  });

  res.json({ success: true, assignments: await assignmentsForClass(classId) });
});
