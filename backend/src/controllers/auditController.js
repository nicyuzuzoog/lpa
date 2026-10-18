import AuditLog from '../models/AuditLog.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/sequence.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 30);
  const filter = {};
  if (req.query.module) filter.module = req.query.module;
  if (req.query.user) filter.user = req.query.user;
  if (req.query.action) filter.action = new RegExp(req.query.action, 'i');
  if (req.query.recordId) filter.recordId = req.query.recordId;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) {
      const to = new Date(req.query.dateTo);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).populate('user', 'fullName username role').sort('-createdAt').skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});
