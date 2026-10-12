import mongoose from 'mongoose';

export const FEE_ITEM_CATEGORIES = ['MATERIAL', 'UNIFORM'];

const feeItemSchema = new mongoose.Schema(
  {
    category: { type: String, enum: FEE_ITEM_CATEGORIES, required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' }],
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('FeeItem', feeItemSchema);
