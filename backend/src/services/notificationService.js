import Notification from '../models/Notification.js';
import User from '../models/User.js';

export async function notify({ title, message, type = 'SYSTEM', relatedRecord = null, createdBy = null, audienceRoles = null }) {
  try {
    let audience = [];
    if (audienceRoles?.length) {
      const users = await User.find({ role: { $in: audienceRoles }, status: 'ACTIVE' }).select('_id');
      audience = users.map((u) => u._id);
    } else {
      const users = await User.find({ status: 'ACTIVE' }).select('_id');
      audience = users.map((u) => u._id);
    }
    return await Notification.create({
      title,
      message,
      type,
      relatedRecord: relatedRecord || { module: '', id: '' },
      audience,
      createdBy,
    });
  } catch (err) {
    console.error('[notification] failed to create:', err.message);
    return null;
  }
}

export async function markRead(notificationId, userId) {
  return Notification.findByIdAndUpdate(notificationId, { $addToSet: { readBy: userId } }, { new: true });
}
