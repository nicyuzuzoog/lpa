import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { PERMISSIONS } from '../middleware/rbac.js';
import { recordAudit } from '../services/auditService.js';

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) throw new ApiError(400, 'Username and password are required');

  const user = await User.findOne({ username: username.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid username or password');
  }
  if (user.status !== 'ACTIVE') throw new ApiError(403, 'This account has been disabled');

  user.lastLoginAt = new Date();
  await user.save();

  await recordAudit({ user, action: 'LOGIN', module: 'AUTH', recordId: user._id, recordLabel: user.username });

  res.json({ success: true, token: signToken(user), user: user.toSafeJSON() });
});

export const me = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const permissions = Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([perm]) => perm);

  res.json({ success: true, user: req.user.toSafeJSON(), permissions });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Current and new password are required');
  if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw new ApiError(401, 'Current password is incorrect');

  user.password = newPassword;
  await user.save();

  await recordAudit({ user, action: 'CHANGE_PASSWORD', module: 'AUTH', recordId: user._id, recordLabel: user.username });
  res.json({ success: true, message: 'Password updated successfully' });
});
