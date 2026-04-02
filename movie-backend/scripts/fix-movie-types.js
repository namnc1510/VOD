const mongoose = require('mongoose');
const config = require('../src/config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../src/config/db');
const Movie = require('../src/models/movie.model');
const Format = require('../src/models/format.model');
const Episode = require('../src/models/episode.model');

async function fixTypes() {
  try {
    await connectToDatabase(config.mongoUri);
    console.log('Connected to database');

    const seriesFormat = await Format.findOne({ name: /series/i });
    const movieFormat = await Format.findOne({ name: /movie/i });

    if (!seriesFormat) {
       console.log('Series format not found, skipping formatRef update for series');
    }

    // 1. Find movies that HAVE episodes
    const moviesWithEpisodes = await Episode.distinct('movie');
    console.log(`Found ${moviesWithEpisodes.length} movies with episodes.`);

    const res1 = await Movie.updateMany(
      { _id: { $in: moviesWithEpisodes } },
      { 
        type: 'series',
        formatRef: seriesFormat ? seriesFormat._id : undefined
      }
    );
    console.log(`Updated ${res1.modifiedCount} movies to "series" type.`);

    // 2. Find movies that DON'T have episodes
    const res2 = await Movie.updateMany(
      { _id: { $not: { $in: moviesWithEpisodes } } },
      { 
        type: 'movie',
        formatRef: movieFormat ? movieFormat._id : undefined
      }
    );
    console.log(`Updated ${res2.modifiedCount} movies to "movie" type.`);

    console.log('Type fix completed successfully!');
  } catch (error) {
    console.error('Error fixing types:', error);
  } finally {
    await disconnectFromDatabase();
  }
}

fixTypes();
