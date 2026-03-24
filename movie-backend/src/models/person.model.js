const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    biography: {
      type: String,
      default: ''
    },
    birthDate: {
      type: Date,
      default: null
    },
    placeOfBirth: {
      type: String,
      default: ''
    },
    nationality: {
      type: String,
      default: ''
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Non-binary', 'Unknown'],
      default: 'Unknown'
    },
    knownFor: {
      type: [String],
      default: ['acting']
    },
    views: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'persons'
  }
);

personSchema.index({ name: 'text' });

const Person = mongoose.models.Person || mongoose.model('Person', personSchema);

module.exports = Person;
