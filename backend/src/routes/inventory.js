import { Router } from 'express';
import {
  listItems,
  createItem,
  updateItem,
  recordTransaction,
  listTransactions,
  lowStock,
} from '../controllers/inventoryController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);

router.get('/items', requirePermission('inventory:read'), listItems);
router.post('/items', requirePermission('inventory:manage'), createItem);
router.put('/items/:id', requirePermission('inventory:manage'), updateItem);
router.post('/items/:id/transactions', requirePermission('inventory:manage'), recordTransaction);
router.get('/transactions', requirePermission('inventory:read'), listTransactions);
router.get('/low-stock', requirePermission('inventory:read'), lowStock);

export default router;
