import { Router } from 'express';
import {
  getMyTeaching,
  getClassStudents,
  getAttendanceSheet,
  saveAttendance,
  getAttendanceSummary,
  listAssessments,
  createAssessment,
  getAssessment,
  updateAssessment,
  saveMarks,
  getAssessmentReport,
  getClassReport,
} from '../controllers/teachingController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);

router.get('/me', requirePermission('teaching:read'), getMyTeaching);
router.get('/classes/:id/students', requirePermission('teaching:read'), getClassStudents);

router.get('/attendance', requirePermission('attendance:read'), getAttendanceSheet);
router.get('/attendance/summary', requirePermission('attendance:read'), getAttendanceSummary);
router.post('/attendance', requirePermission('attendance:mark'), saveAttendance);

router.get('/assessments', requirePermission('assessments:read'), listAssessments);
router.post('/assessments', requirePermission('assessments:manage'), createAssessment);
router.get('/assessments/:id', requirePermission('assessments:read'), getAssessment);
router.put('/assessments/:id', requirePermission('assessments:manage'), updateAssessment);
router.put('/assessments/:id/marks', requirePermission('assessments:manage'), saveMarks);
router.get('/assessments/:id/report', requirePermission('assessments:read'), getAssessmentReport);

router.get('/report', requirePermission('assessments:read'), getClassReport);

export default router;
