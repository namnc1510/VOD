const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true
    },
    progressSeconds: {
      type: Number,
      min: 0,
      default: 0
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tv', 'unknown'],
      default: 'unknown',
      index: true
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'watchlists'
  }
);

watchlistSchema.index({ user: 1, movie: 1 }, { unique: true });
watchlistSchema.index({ user: 1, updatedAt: -1 });

const Watchlist = mongoose.models.Watchlist || mongoose.model('Watchlist', watchlistSchema);

module.exports = Watchlist;
