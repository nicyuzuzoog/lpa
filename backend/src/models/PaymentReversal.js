import mongoose from 'mongoose';

const paymentReversalSchema = new mongoose.Schema(
  {
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    type: { type: String, enum: ['REVERSAL', 'CORRECTION', 'VOID'], required: true },
    originalAmount: { type: Number, required: true },
    correctedAmount: { type: Number, default: null },
    reason: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentReversal', paymentReversalSchema);
