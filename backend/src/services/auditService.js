import AuditLog from '../models/AuditLog.js';

export async function recordAudit({ user, action, module, recordId = '', recordLabel = '', oldValue = null, newValue = null, reason = '' }) {
  try {
    await AuditLog.create({
      user: user?._id || user,
      action,
      module,
      recordId: String(recordId),
      recordLabel,
      oldValue,
      newValue,
      reason,
    });
  } catch (err) {
    console.error('[audit] failed to record:', err.message);
  }
}

export function diffObjects(oldObj = {}, newObj = {}, fields = []) {
  const changes = {};
  for (const field of fields) {
    const a = oldObj?.[field];
    const b = newObj?.[field];
    const na = a instanceof Date ? a.toISOString() : a;
    const nb = b instanceof Date ? b.toISOString() : b;
    if (JSON.stringify(na ?? null) !== JSON.stringify(nb ?? null)) {
      changes[field] = { from: na ?? null, to: nb ?? null };
    }
  }
  return Object.keys(changes).length ? changes : null;
}
