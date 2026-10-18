import { Router } from 'express';
import {
  listPayments,
  createPayment,
  getPayment,
  getReceipt,
  updatePayment,
  reversePayment,
  voidPayment,
  studentBalances,
} from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('payments:read'), listPayments);
router.post('/', requirePermission('payments:create'), createPayment);
router.get('/balances', requirePermission('payments:read'), studentBalances);
router.get('/:id', requirePermission('payments:read'), getPayment);
router.get('/:id/receipt', requirePermission('payments:read'), getReceipt);
router.put('/:id', requirePermission('payments:update'), updatePayment);
router.post('/:id/reverse', requirePermission('payments:reverse'), reversePayment);
router.post('/:id/void', requirePermission('payments:reverse'), voidPayment);

export default router;
