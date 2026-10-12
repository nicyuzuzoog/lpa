import { Router } from 'express';
import { listYears, createYear, updateYear, addTerm, updateTerm } from '../controllers/academicYearController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('academicYears:read'), listYears);
router.post('/', requirePermission('academicYears:manage'), createYear);
router.put('/:id', requirePermission('academicYears:manage'), updateYear);
router.post('/:id/terms', requirePermission('academicYears:manage'), addTerm);
router.put('/:id/terms/:termId', requirePermission('academicYears:manage'), updateTerm);

export default router;
