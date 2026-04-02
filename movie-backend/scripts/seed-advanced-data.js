const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const config = require('../src/config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../src/config/db');
const Movie = require('../src/models/movie.model');
const User = require('../src/models/user.model');
const Person = require('../src/models/person.model');
const Episode = require('../src/models/episode.model');
const slugify = require('../src/utils/slug');

const DEFAULT_PASSWORD = 'User@123456';

const actorsData = [
  { name: 'Leonardo DiCaprio', nationality: 'American', gender: 'Male', knownFor: ['acting'], biography: 'An American actor and film producer, known for his work in biopics and period films.' },
  { name: 'Scarlett Johansson', nationality: 'American', gender: 'Female', knownFor: ['acting'], biography: 'An American actress. The world\'s highest-paid actress in 2018 and 2019.' },
  { name: 'Robert Downey Jr.', nationality: 'American', gender: 'Male', knownFor: ['acting'], biography: 'An American actor and producer. His career has been characterized by critical and popular success in his youth.' },
  { name: 'Tom Hanks', nationality: 'American', gender: 'Male', knownFor: ['acting'], biography: 'An American actor and filmmaker. Known for both his comedic and dramatic roles.' },
  { name: 'Meryl Streep', nationality: 'American', gender: 'Female', knownFor: ['acting'], biography: 'An American actress. Often described as the "best actress of her generation".' },
  { name: 'Denzel Washington', nationality: 'American', gender: 'Male', knownFor: ['acting'], biography: 'An American actor, director, and producer. He has been described as an actor who reconfigured "the concept of classic movie stardom".' },
  { name: 'Brie Larson', nationality: 'American', gender: 'Female', knownFor: ['acting'], biography: 'An American actress and filmmaker. Known for her supporting roles in comedies as a teenager.' },
  { name: 'Kang-ho Song', nationality: 'South Korean', gender: 'Male', knownFor: ['acting'], biography: 'A South Korean actor who has starred in Parasite and other acclaimed films.' },
  { name: 'Zendaya', nationality: 'American', gender: 'Female', knownFor: ['acting'], biography: 'An American actress and singer. She has received various accolades, including two Primetime Emmy Awards.' },
  { name: 'Ryan Reynolds', nationality: 'Canadian', gender: 'Male', knownFor: ['acting', 'producing'], biography: 'A Canadian-American actor and film producer.' }
];

const directorsData = [
  { name: 'Christopher Nolan', nationality: 'British-American', gender: 'Male', knownFor: ['directing', 'writing'], biography: 'A British-American film director, screenwriter, and producer.' },
  { name: 'Steven Spielberg', nationality: 'American', gender: 'Male', knownFor: ['directing'], biography: 'An American filmmaker. He is considered one of the founding pioneers of the New Hollywood era.' },
  { name: 'Martin Scorsese', nationality: 'American', gender: 'Male', knownFor: ['directing', 'producing'], biography: 'An American film director, producer, screenwriter, and actor.' },
  { name: 'Quentin Tarantino', nationality: 'American', gender: 'Male', knownFor: ['directing', 'writing'], biography: 'An American film director, screenwriter, producer, and actor.' },
  { name: 'Greta Gerwig', nationality: 'American', gender: 'Female', knownFor: ['directing', 'writing', 'acting'], biography: 'An American actress, screenwriter, and director.' },
  { name: 'Bong Joon-ho', nationality: 'South Korean', gender: 'Male', knownFor: ['directing', 'writing'], biography: 'A South Korean film director, producer and screenwriter.' }
];

const usersData = [
  { name: 'Alice Johnson', email: 'alice@example.com', plan: 'standard', role: 'user' },
  { name: 'Bob Smith', email: 'bob@example.com', plan: 'premium', role: 'user' },
  { name: 'Charlie Davis', email: 'charlie@example.com', plan: 'ultimate', role: 'user' },
  { name: 'Diana Editor', email: 'diana@example.com', plan: 'premium', role: 'editor' },
  { name: 'Ethan Moderator', email: 'ethan@example.com', plan: 'free', role: 'moderator' },
  { name: 'Frank User', email: 'frank@example.com', plan: 'free', role: 'user' },
  { name: 'Grace Member', email: 'grace@example.com', plan: 'standard', role: 'user' },
  { name: 'Henry Ultra', email: 'henry@example.com', plan: 'ultimate', role: 'user' }
];

async function seed() {
  try {
    await connectToDatabase(config.mongoUri);
    console.log('Connected to database');

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // 1. Seed Persons (Actors & Directors)
    console.log('Seeding persons...');
    const allPersonsData = [...actorsData, ...directorsData].map(p => ({
      ...p,
      slug: slugify(p.name),
      avatarUrl: `https://i.pravatar.cc/300?u=${slugify(p.name)}`,
      views: Math.floor(Math.random() * 5000)
    }));

    const persons = [];
    for (const p of allPersonsData) {
       const existing = await Person.findOne({ slug: p.slug });
       if (existing) {
         persons.push(existing);
         continue;
       }
       const saved = await Person.create(p);
       persons.push(saved);
    }
    console.log(`Successfully seeded/verified ${persons.length} persons.`);

    // 2. Seed Users
    console.log('Seeding users...');
    let usersCreated = 0;
    for (const u of usersData) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        await User.create({
          ...u,
          passwordHash,
          avatarUrl: `https://i.pravatar.cc/300?u=${u.email}`
        });
        usersCreated++;
      }
    }
    console.log(`Successfully seeded ${usersCreated} new users.`);

    // 3. Link Persons to Movies
    console.log('Linking persons to movies...');
    const movies = await Movie.find({ deletedAt: null }).limit(20);
    const actorRefs = persons.filter(p => p.knownFor.includes('acting'));
    const directorRefs = persons.filter(p => p.knownFor.includes('directing'));

    for (const movie of movies) {
      // Pick random actors and directors
      const movieActors = actorRefs.sort(() => 0.5 - Math.random()).slice(0, 3);
      const movieDirectors = directorRefs.sort(() => 0.5 - Math.random()).slice(0, 1);

      movie.actors = movieActors.map(a => a._id);
      movie.directors = movieDirectors.map(d => d._id);
      
      // Update string fields for legacy support
      movie.cast = movieActors.map(a => a.name);
      movie.director = movieDirectors.length > 0 ? movieDirectors[0].name : '';

      await movie.save();
    }
    console.log('Updated 20 movies with person linkages.');

    // 4. Seed Episodes for "series" type movies or just first 5 movies
    console.log('Seeding episodes...');
    const movieCandidates = await Movie.find({ deletedAt: null }).limit(5);
    let episodesTotal = 0;

    for (const movie of movieCandidates) {
      const existingEpisodes = await Episode.countDocuments({ movie: movie._id });
      if (existingEpisodes > 0) continue;

      const epCount = 12;
      const episodes = [];
      for (let i = 1; i <= epCount; i++) {
        episodes.push({
          movie: movie._id,
          epNo: i,
          title: `Episode ${i}: ${movie.title} - Chapter ${i}`,
          overview: `In this episode ${i} of ${movie.title}, the journey continues with more excitement and drama.`,
          durationSeconds: 2400 + Math.floor(Math.random() * 600),
          status: 'published',
          streamUrl: movie.streamUrl,
          airDate: new Date(Date.now() - (epCount - i) * 7 * 24 * 60 * 60 * 1000)
        });
      }
      await Episode.insertMany(episodes);
      
      // Update movie totalEpisodes
      movie.totalEpisodes = epCount;
      await movie.save();
      episodesTotal += epCount;
    }
    console.log(`Successfully seeded ${episodesTotal} episodes across movies.`);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await disconnectFromDatabase();
  }
}

seed();
