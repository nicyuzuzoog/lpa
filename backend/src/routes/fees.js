import { Router } from 'express';
import {
  listStructures,
  createStructure,
  updateStructure,
  archiveStructure,
  listItems,
  createItem,
  updateItem,
  archiveItem,
  validateTotals,
} from '../controllers/feeController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);

router.get('/structures', requirePermission('fees:read'), listStructures);
router.post('/structures', requirePermission('fees:manageStructures'), createStructure);
router.put('/structures/:id', requirePermission('fees:manageStructures'), updateStructure);
router.delete('/structures/:id', requirePermission('fees:manageStructures'), archiveStructure);

router.get('/items', requirePermission('fees:read'), listItems);
router.post('/items', requirePermission('fees:manageItems'), createItem);
router.put('/items/:id', requirePermission('fees:manageItems'), updateItem);
router.delete('/items/:id', requirePermission('fees:manageItems'), archiveItem);

router.get('/validate', requirePermission('fees:read'), validateTotals);

export default router;
