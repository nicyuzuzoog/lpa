import { Router } from 'express';
import { listClasses, createClass, updateClass, deleteClass } from '../controllers/classController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('classes:read'), listClasses);
router.post('/', requirePermission('classes:manage'), createClass);
router.put('/:id', requirePermission('classes:manage'), updateClass);
router.delete('/:id', requirePermission('classes:manage'), deleteClass);

export default router;
