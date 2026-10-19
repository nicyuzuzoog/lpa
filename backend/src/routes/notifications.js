import { Router } from 'express';
import { list, unreadCount, markRead, markAllRead, sendReminder } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.get('/unread-count', unreadCount);
router.post('/mark-all-read', markAllRead);
router.post('/reminders', requirePermission('notifications:send'), sendReminder);
router.post('/:id/read', markRead);

export default router;
