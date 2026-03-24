const mongoose = require('mongoose');
require('./movie.model');

const episodeSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    epNo: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    overview: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    durationSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['published', 'draft', 'scheduled', 'hidden'],
      default: 'draft',
      index: true,
    },
    streamUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    airDate: {
      type: Date,
      default: null,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'episodes',
  },
);

episodeSchema.index({ title: 'text', overview: 'text' });
episodeSchema.index(
  { movie: 1, epNo: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);
episodeSchema.index({ movie: 1, createdAt: -1 });

const Episode =
  mongoose.models.Episode || mongoose.model('Episode', episodeSchema);

module.exports = Episode;

