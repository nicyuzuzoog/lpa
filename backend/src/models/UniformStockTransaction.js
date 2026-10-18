import mongoose from 'mongoose';

export const UNIFORM_STOCK_TYPES = ['RECEIVED', 'ISSUED', 'RETURNED', 'DAMAGED', 'LOST', 'ADJUSTMENT'];

const uniformStockTransactionSchema = new mongoose.Schema(
  {
    uniformItem: { type: mongoose.Schema.Types.ObjectId, ref: 'UniformItem', required: true },
    type: { type: String, enum: UNIFORM_STOCK_TYPES, required: true },
    quantity: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

uniformStockTransactionSchema.index({ uniformItem: 1, date: -1 });

export default mongoose.model('UniformStockTransaction', uniformStockTransactionSchema);
