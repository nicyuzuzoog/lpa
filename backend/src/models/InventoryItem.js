import mongoose from 'mongoose';

export const INVENTORY_CATEGORIES = [
  'FOOD',
  'SCHOOL_BOOKS',
  'STATIONERY',
  'SPORTS_EQUIPMENT',
  'CLEANING',
  'OTHER',
];

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, enum: INVENTORY_CATEGORIES, default: 'OTHER' },
    unit: { type: String, required: true, trim: true },
    openingStock: { type: Number, default: 0, min: 0 },
    currentStock: { type: Number, default: 0, min: 0 },
    minimumStockLevel: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    lastMovementAt: { type: Date, default: null },
  },
  { timestamps: true }
);

inventoryItemSchema.virtual('isLow').get(function () {
  return this.currentStock <= this.minimumStockLevel;
});

inventoryItemSchema.set('toJSON', { virtuals: true });
inventoryItemSchema.set('toObject', { virtuals: true });

export default mongoose.model('InventoryItem', inventoryItemSchema);
