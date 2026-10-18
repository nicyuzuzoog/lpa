import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/sequence.js';

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
  await Notification.updateOne({ _id: req.params.id, audience: req.user._id }, { $addToSet: { readBy: req.user._id } });
  res.json({ success: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ audience: req.user._id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  res.json({ success: true });
});
