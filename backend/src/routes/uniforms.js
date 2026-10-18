import { Router } from 'express';
import {
  listItems,
  createItem,
  updateItem,
  recordStockTransaction,
  listStockTransactions,
  issueToStudent,
  listIssuances,
  verifyStudent,
  studentUniformBalance,
  distributionReport,
} from '../controllers/uniformController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);

router.get('/items', requirePermission('uniforms:read'), listItems);
router.post('/items', requirePermission('uniforms:manage'), createItem);
router.put('/items/:id', requirePermission('uniforms:manage'), updateItem);
router.post('/items/:id/transactions', requirePermission('uniforms:manage'), recordStockTransaction);
router.get('/transactions', requirePermission('uniforms:read'), listStockTransactions);

router.get('/issuances', requirePermission('uniforms:read'), listIssuances);
router.post('/issuances', requirePermission('uniforms:issue'), issueToStudent);
router.get('/verification/:id', requirePermission('uniforms:read'), verifyStudent);
router.get('/student-balance/:id', requirePermission('uniforms:read'), studentUniformBalance);
router.get('/distribution', requirePermission('uniforms:read'), distributionReport);

export default router;
