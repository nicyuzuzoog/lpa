import { Router } from 'express';
import {
  collectionByPeriod,
  breakdown,
  outstandingBalances,
  studentStatement,
  inventoryReport,
  uniformReport,
  feeStructuresReport,
} from '../controllers/reportController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);

router.get('/financial/collections', requirePermission('reports:read'), collectionByPeriod);
router.get('/financial/breakdown', requirePermission('reports:read'), breakdown);
router.get('/financial/outstanding', requirePermission('reports:read'), outstandingBalances);
router.get('/financial/statements/:studentId', requirePermission('reports:read'), studentStatement);
router.get('/fees', requirePermission('reports:read'), feeStructuresReport);
router.get('/inventory', requirePermission('reports:read'), inventoryReport);
router.get('/uniforms', requirePermission('reports:read'), uniformReport);

export default router;
