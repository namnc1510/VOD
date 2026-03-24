const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    // Single-document settings store.
    key: {
      type: String,
      required: true,
      default: 'default',
      unique: true,
      index: true
    },

    siteName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'CinemaStream Premium'
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'UTC +00:00 (Greenwich Mean Time)'
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: 'Watch thousands of HD movies and TV shows from around the world on CinemaStream.'
    },

    // Brand/UI preferences.
    darkMode: {
      type: Boolean,
      default: false
    },
    themeColor: {
      type: String,
      trim: true,
      maxlength: 16,
      default: '#1F90F9'
    },
    layout: {
      type: String,
      enum: ['side', 'top'],
      default: 'side'
    },
    fontFamily: {
      type: String,
      maxlength: 100,
      default: '"Spline Sans", sans-serif'
    },

    // SEO/Marketing
    metaTitle: {
      type: String,
      trim: true,
      maxlength: 140,
      default: ''
    },
    gaId: {
      type: String,
      trim: true,
      maxlength: 64,
      default: ''
    },
    keywords: {
      type: [String],
      default: []
    },

    // Social Links
    facebookUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    twitterUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    instagramUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    youtubeUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    // Assets
    logoUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    faviconUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    // Streaming/CDN (kept minimal for now)
    cdnBaseUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    // Homepage Hero slider configuration.
    homeHeroMovieIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    },
    homeHeroLimit: {
      type: Number,
      min: 1,
      max: 12,
      default: 6
    },
    homeHeroAutofill: {
      type: Boolean,
      default: true
    },
    homeHeroAutoPlay: {
      type: Boolean,
      default: true
    },
    homeHeroInterval: {
      type: Number,
      min: 1,
      max: 60,
      default: 6.5
    },

    // Dynamic Pricing Config
    subscriptionPlans: {
      type: Object,
      default: {
        standard: { monthly: 49000, annual: 470000 },
        premium: { monthly: 89000, annual: 850000 },
        ultimate: { monthly: 149000, annual: 1430000 }
      }
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'settings'
  }
);

const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

module.exports = Setting;
