const mongoose = require('mongoose');

const formatSchema = new mongoose.Schema(
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
    collection: 'formats'
  }
);

const Format = mongoose.models.Format || mongoose.model('Format', formatSchema);

module.exports = Format;
