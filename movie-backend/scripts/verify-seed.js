const mongoose = require('mongoose');
const config = require('../src/config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../src/config/db');
const Movie = require('../src/models/movie.model');
const User = require('../src/models/user.model');
const Person = require('../src/models/person.model');
const Episode = require('../src/models/episode.model');

async function verify() {
  try {
    await connectToDatabase(config.mongoUri);
    console.log('--- Verification Report ---');

    const personCount = await Person.countDocuments();
    console.log(`Persons: ${personCount}`);

    const userCount = await User.countDocuments();
    console.log(`Users: ${userCount}`);

    const movieWithLinksCount = await Movie.countDocuments({ 
      $or: [
        { actors: { $not: { $size: 0 } } },
        { directors: { $not: { $size: 0 } } }
      ]
    });
    console.log(`Movies with Person linkages: ${movieWithLinksCount}`);

    const episodeCount = await Episode.countDocuments();
    console.log(`Episodes: ${episodeCount}`);

    const sampleUser = await User.findOne({ email: 'alice@example.com' });
    if (sampleUser) {
      console.log(`Sample User "Alice" found: ${sampleUser.name} (${sampleUser.plan})`);
    }

    const samplePerson = await Person.findOne({ name: 'Leonardo DiCaprio' });
    if (samplePerson) {
      console.log(`Sample Person "Leo" found: ${samplePerson.name} (${samplePerson.nationality})`);
    }

    console.log('--- End of Report ---');
  } catch (error) {
    console.error('Verification error:', error);
  } finally {
    await disconnectFromDatabase();
  }
}

verify();
