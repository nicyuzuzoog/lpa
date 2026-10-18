import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, me, changePassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later' },
});

router.post('/login', loginLimiter, login);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, changePassword);

export default router;
