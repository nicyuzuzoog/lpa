import mongoose from 'mongoose';

export const STOCK_TRANSACTION_TYPES = [
  'RECEIVED',
  'ISSUED',
  'RETURNED',
  'DAMAGED',
  'LOST',
  'ADJUSTMENT',
];

const inventoryTransactionSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    type: { type: String, enum: STOCK_TRANSACTION_TYPES, required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
    reference: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['ACTIVE', 'VOID'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ item: 1, date: -1 });
inventoryTransactionSchema.index({ type: 1, date: -1 });

export default mongoose.model('InventoryTransaction', inventoryTransactionSchema);
