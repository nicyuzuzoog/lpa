import { Router } from 'express';
import { list } from '../controllers/auditController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('audit:read'), list);

export default router;
