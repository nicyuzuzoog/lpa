import { Router } from 'express';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('users:read'), listUsers);
// The Accountant can add users; only the Super Admin can change them.
router.post('/', requirePermission('users:create'), createUser);
router.put('/:id', requirePermission('users:manage'), updateUser);
// Super Admin only: an account may be deleted, or simply disabled via PUT.
router.delete('/:id', requirePermission('users:delete'), deleteUser);

export default router;
