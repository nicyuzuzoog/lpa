import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'PAYMENT',
  'STUDENT',
  'INVENTORY',
  'UNIFORM',
  'USER',
  'REPORT',
  'SYSTEM',
];

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'SYSTEM' },
    relatedRecord: {
      module: { type: String, default: '' },
      id: { type: String, default: '' },
    },
    audience: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
