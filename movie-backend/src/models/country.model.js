const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema(
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
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'countries'
  }
);

const Country = mongoose.models.Country || mongoose.model('Country', countrySchema);

module.exports = Country;
