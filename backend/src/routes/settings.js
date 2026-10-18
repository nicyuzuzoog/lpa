import { Router } from 'express';
import { getSettings, getBranding, updateSettings } from '../controllers/settingController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.get('/branding', getBranding);
router.get('/', requirePermission('settings:read'), getSettings);
router.put('/', requirePermission('settings:manage'), updateSettings);

export default router;
