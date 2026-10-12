import User, { ROLES } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/sequence.js';
import { recordAudit, diffObjects } from '../services/auditService.js';
import { notify } from '../services/notificationService.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).trim(), 'i');
    filter.$or = [{ fullName: rx }, { username: rx }, { email: rx }];
  }
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, items: items.map((u) => u.toSafeJSON()), total, page, pages: Math.ceil(total / limit) });
});

export const createUser = asyncHandler(async (req, res) => {
  const { fullName, username, password, role, email } = req.body;
  if (!fullName || !username || !password) throw new ApiError(400, 'Full name, username and password are required');
  if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
  if (!ROLES.includes(role)) throw new ApiError(400, 'Invalid role');

  const exists = await User.findOne({ username: username.toLowerCase().trim() });
  if (exists) throw new ApiError(409, 'This username is already taken');

  const user = await User.create({ fullName, username, password, role, email: email || null });

  await recordAudit({
    user: req.user,
    action: 'CREATE',
    module: 'USERS',
    recordId: user._id,
    recordLabel: user.username,
    newValue: { fullName, username, role },
  });
  await notify({
    title: 'New user created',
    message: `${user.fullName} was created as ${user.role}`,
    type: 'USER',
    relatedRecord: { module: 'users', id: String(user._id) },
    createdBy: req.user._id,
    audienceRoles: ['SUPER_ADMIN'],
  });

  res.status(201).json({ success: true, user: user.toSafeJSON() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const { fullName, email, role, status, password } = req.body;
  const before = user.toObject();

  if (role && !ROLES.includes(role)) throw new ApiError(400, 'Invalid role');
  if (role && role !== user.role && user.role === 'SUPER_ADMIN' && req.user._id.equals(user._id)) {
    throw new ApiError(400, 'You cannot change your own role');
  }
  if (fullName) user.fullName = fullName;
  if (email !== undefined) user.email = email || null;
  if (role) user.role = role;
  if (status) {
    if (!['ACTIVE', 'DISABLED'].includes(status)) throw new ApiError(400, 'Invalid status');
    if (status === 'DISABLED' && req.user._id.equals(user._id)) throw new ApiError(400, 'You cannot disable your own account');
    user.status = status;
  }
  if (password) {
    if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
    user.password = password;
  }

  await user.save();
  const changes = diffObjects(before, user.toObject(), ['fullName', 'email', 'role', 'status']);

  await recordAudit({
    user: req.user,
    action: 'UPDATE',
    module: 'USERS',
    recordId: user._id,
    recordLabel: user.username,
    oldValue: changes ? Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.from])) : null,
    newValue: changes,
  });
  if (changes) {
    await notify({
      title: 'User updated',
      message: `${user.fullName}'s account was updated (${Object.keys(changes).join(', ')})`,
      type: 'USER',
      relatedRecord: { module: 'users', id: String(user._id) },
      createdBy: req.user._id,
      audienceRoles: ['SUPER_ADMIN'],
    });
  }

  res.json({ success: true, user: user.toSafeJSON() });
});
