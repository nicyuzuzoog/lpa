import mongoose from 'mongoose';

export const UNIFORM_GENDERS = ['BOYS', 'GIRLS', 'UNISEX'];

const uniformItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: UNIFORM_GENDERS, default: 'UNISEX' },
    size: { type: String, default: 'FREE' },
    price: { type: Number, required: true, min: 0 },
    quantityReceived: { type: Number, default: 0, min: 0 },
    quantityIssued: { type: Number, default: 0, min: 0 },
    quantityReturned: { type: Number, default: 0, min: 0 },
    quantityDamaged: { type: Number, default: 0, min: 0 },
    minimumStockLevel: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

uniformItemSchema.virtual('quantityRemaining').get(function () {
  return this.quantityReceived - this.quantityIssued + this.quantityReturned - this.quantityDamaged;
});

uniformItemSchema.virtual('isLow').get(function () {
  return this.quantityRemaining <= this.minimumStockLevel;
});

uniformItemSchema.set('toJSON', { virtuals: true });
uniformItemSchema.set('toObject', { virtuals: true });

export default mongoose.model('UniformItem', uniformItemSchema);
