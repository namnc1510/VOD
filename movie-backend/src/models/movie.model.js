const mongoose = require('mongoose');
require('./category.model');
require('./country.model');
require('./quality.model');
require('./format.model');
require('./person.model');

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 160
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      default: 'movie',
      index: true
    },
    accessMode: {
      type: String,
      enum: ['free', 'standard', 'premium', 'ultimate'],
      default: 'free',
      index: true
    },
    // Normalized taxonomy references (optional, backward compatible with `type` string field).
    formatRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Format',
      default: null,
      index: true
    },
    overview: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ''
    },
    genres: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    countries: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Country'
    }],
    releaseYear: {
      type: Number,
      min: 1888,
      max: 2100
    },
    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    imdbRating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
      index: true
    },
    durationMinutes: {
      type: Number,
      min: 1,
      default: 90
    },
    totalEpisodes: {
      type: Number,
      min: 0,
      default: 0
    },
    quality: {
      type: String,
      default: 'HD'
    },
    // Normalized taxonomy references (optional, backward compatible with `quality` string field).
    qualityRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quality',
      default: null,
      index: true
    },
    audioLanguage: {
      type: String,
      trim: true,
      default: 'English'
    },
    ageRating: {
      type: String,
      trim: true,
      default: 'PG-13'
    },
    posterUrl: {
      type: String,
      trim: true,
      default: ''
    },
    backdropUrl: {
      type: String,
      trim: true,
      default: ''
    },
    trailerUrl: {
      type: String,
      trim: true,
      default: ''
    },
    streamUrl: {
      type: String,
      trim: true,
      default: ''
    },
    gallery: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    director: {
      type: String,
      trim: true,
      default: ''
    },
    directors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person'
    }],
    writers: {
      type: [String],
      default: []
    },
    cast: {
      type: [String],
      default: []
    },
    actors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person'
    }],
    status: {
      type: String,
      enum: ['released', 'coming_soon', 'hidden'],
      default: 'released',
      index: true
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    isTrending: {
      type: Boolean,
      default: false,
      index: true
    },
    isNewRelease: {
      type: Boolean,
      default: false,
      index: true
    },
    views: {
      type: Number,
      min: 0,
      default: 0,
      index: true
    },
    trendingScore: {
      type: Number,
      min: 0,
      default: 0,
      index: true
    },
    releaseDate: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'movies'
  }
);

movieSchema.index({ title: 'text', overview: 'text', tags: 'text' });
movieSchema.index({ genres: 1 });
movieSchema.index({ countries: 1 });
movieSchema.index({ releaseYear: -1 });
movieSchema.index({ createdAt: -1 });
movieSchema.index({ isTrending: -1, trendingScore: -1 });
movieSchema.index({ isNewRelease: -1, releaseYear: -1 });
movieSchema.index({ isFeatured: -1, createdAt: -1 });

const Movie = mongoose.models.Movie || mongoose.model('Movie', movieSchema);

module.exports = Movie;
