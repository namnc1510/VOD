const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: ''
    },
    plan: {
      type: String,
      enum: ['free', 'standard', 'premium', 'ultimate'],
      default: 'free',
      index: true
    },
    planExpiresAt: {
      type: Date
    },
    planStartedAt: {
      type: Date
    },
    watchedCount: {
      type: Number,
      min: 0,
      default: 0
    },
    passwordHash: {
      type: String,
      select: false
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'editor', 'moderator', 'super'],
      default: 'user',
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'users'
  }
);

userSchema.index({ name: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ watchedCount: -1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
