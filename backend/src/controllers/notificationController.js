import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User, { ROLES } from '../models/User.js';
import Student from '../models/Student.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/sequence.js';
import { recordAudit } from '../services/auditService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20);
  const filter = { audience: req.user._id };
  if (req.query.unread === 'true') filter.readBy = { $ne: req.user._id };
  if (req.query.type) filter.type = req.query.type;

  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort('-createdAt').skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ audience: req.user._id, readBy: { $ne: req.user._id } }),
  ]);

  res.json({ success: true, items, total, unread, page, pages: Math.ceil(total / limit) });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const unread = await Notification.countDocuments({ audience: req.user._id, readBy: { $ne: req.user._id } });
  res.json({ success: true, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Notification not found');
  await Notification.updateOne({ _id: req.params.id, audience: req.user._id }, { $addToSet: { readBy: req.user._id } });
  res.json({ success: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ audience: req.user._id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  res.json({ success: true });
});

// Send a manual reminder to the chosen audience (everyone, or specific roles).
// Optionally tied to a student (e.g. "Alice still owes 50,000 RWF").
export const sendReminder = asyncHandler(async (req, res) => {
  const { title, message, roles, student } = req.body || {};
  const text = String(message || '').trim();
  if (text.length < 3) throw new ApiError(400, 'A reminder message is required');

  const audienceFilter = { status: 'ACTIVE' };
  if (Array.isArray(roles) && roles.length) {
    const wanted = roles.filter((r) => ROLES.includes(r));
    if (!wanted.length) throw new ApiError(400, 'Select a valid audience');
    audienceFilter.role = { $in: wanted };
  }

  const recipients = await User.find(audienceFilter).select('_id');
  if (!recipients.length) throw new ApiError(400, 'There are no active users in the selected audience');

  let relatedRecord = { module: 'notifications', id: '' };
  let studentLabel = '';
  if (student && mongoose.isValidObjectId(student)) {
    const found = await Student.findById(student).select('studentId firstName lastName');
    if (found) {
      relatedRecord = { module: 'students', id: String(found._id) };
      studentLabel = `${found.studentId} - ${found.firstName} ${found.lastName}`;
    }
  }

  const doc = await Notification.create({
    title: String(title || '').trim() || 'Reminder',
    message: text,
    type: 'REMINDER',
    relatedRecord,
    audience: recipients.map((u) => u._id),
    createdBy: req.user._id,
  });

  await recordAudit({
    user: req.user,
    action: 'SEND',
    module: 'NOTIFICATIONS',
    recordId: doc._id,
    recordLabel: `${doc.title}${studentLabel ? ` (${studentLabel})` : ''}`,
    newValue: { recipients: recipients.length, roles: audienceFilter.role || 'ALL', message: text },
  });

  res.status(201).json({ success: true, item: doc, recipients: recipients.length });
});
