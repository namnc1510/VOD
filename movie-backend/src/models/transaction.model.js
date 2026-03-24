const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'VND',
      required: true
    },
    planPurchased: {
      type: String,
      enum: ['free', 'standard', 'premium', 'ultimate'],
      required: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed'
    },
    paymentMethod: {
      type: String,
      default: 'vnpay'
    }
  },
  {
    timestamps: true
  }
);

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ status: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
