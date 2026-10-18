import { Router } from 'express';
import { listUsers, createUser, updateUser } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('users:read'), listUsers);
router.post('/', requirePermission('users:manage'), createUser);
router.put('/:id', requirePermission('users:manage'), updateUser);

export default router;
