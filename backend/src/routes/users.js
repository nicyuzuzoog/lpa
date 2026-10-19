import { Router } from 'express';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('users:read'), listUsers);
router.post('/', requirePermission('users:manage'), createUser);
router.put('/:id', requirePermission('users:manage'), updateUser);
// No role holds 'users:delete': accounts are disabled, never removed.
router.delete('/:id', requirePermission('users:delete'), deleteUser);

export default router;
