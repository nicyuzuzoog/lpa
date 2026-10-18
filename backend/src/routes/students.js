import { Router } from 'express';
import { body } from 'express-validator';
import { listStudents, getStudent, createStudent, updateStudent, listMealStudents } from '../controllers/studentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import validate from '../middleware/validate.js';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('students:read'), listStudents);
router.get('/meals', requirePermission('students:read'), listMealStudents);
router.get('/:id', requirePermission('students:read'), getStudent);
router.post(
  '/',
  requirePermission('students:create'),
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('gender').isIn(['MALE', 'FEMALE']).withMessage('Gender must be MALE or FEMALE'),
    body('motherPhone').optional().isString(),
    body('fatherPhone').optional().isString(),
  ],
  validate,
  createStudent
);
router.put('/:id', requirePermission('students:update'), updateStudent);

export default router;
