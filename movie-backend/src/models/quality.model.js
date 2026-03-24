const mongoose = require('mongoose');

const qualitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'qualities'
  }
);

const Quality = mongoose.models.Quality || mongoose.model('Quality', qualitySchema);

module.exports = Quality;
