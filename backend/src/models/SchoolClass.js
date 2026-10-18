import mongoose from 'mongoose';

const schoolClassSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    level: { type: String, enum: ['NURSERY', 'PRIMARY'], default: 'PRIMARY' },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export default mongoose.model('SchoolClass', schoolClassSchema);
