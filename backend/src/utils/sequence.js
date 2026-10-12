import Setting from '../models/Setting.js';

export async function nextSequence(key) {
  const doc = await Setting.findOneAndUpdate(
    { key: `seq_${key}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return doc.value || 1;
}

export function pad(n, width = 5) {
  return String(n).padStart(width, '0');
}

export function parsePagination(query, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
