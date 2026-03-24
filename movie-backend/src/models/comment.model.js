const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 1000
    },

    // Moderation status for admin panel.
    // Existing documents (created before this field existed) may not have status set.
    status: {
      type: String,
      enum: ['pending', 'approved', 'spam'],
      default: 'pending',
      index: true
    },
    // Allow moderators to hide a comment from public pages without deleting it.
    hidden: {
      type: Boolean,
      default: false,
      index: true
    },
    // Soft delete to support safe moderation actions.
    deletedAt: {
      type: Date,
      default: null,
      index: true
    },
    likesCount: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'comments'
  }
);

commentSchema.index({ movie: 1, createdAt: -1 });
commentSchema.index({ status: 1, createdAt: -1 });
commentSchema.index({ deletedAt: 1, createdAt: -1 });

const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);

module.exports = Comment;
