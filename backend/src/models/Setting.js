import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

settingSchema.statics.get = async function (key, fallback = null) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : fallback;
};

settingSchema.statics.set = async function (key, value) {
  return this.findOneAndUpdate({ key }, { $set: { value } }, { upsert: true, new: true });
};

export default mongoose.model('Setting', settingSchema);
