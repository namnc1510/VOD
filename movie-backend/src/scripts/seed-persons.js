const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Person = require('../models/person.model');
const Movie = require('../models/movie.model');
const slugify = require('slugify');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Pre-seeded rich data. We will also dynamically harvest strings from the database!
const famousPersons = [
  { name: 'Keanu Reeves', knownFor: 'acting', avatarUrl: 'https://image.tmdb.org/t/p/w500/rRdru6REr9i3WIHv2mntpcgx6Ta.jpg', nationality: 'Canadian', birthDate: '1964-09-02', biography: 'Keanu Charles Reeves is a Canadian actor.', placeOfBirth: 'Beirut, Lebanon', gender: 'Male' },
  { name: 'Christopher Nolan', knownFor: 'directing', avatarUrl: 'https://image.tmdb.org/t/p/w500/xuAIuYSsl1mStAqQQH1A2G53O4a.jpg', nationality: 'British-American', birthDate: '1970-07-30', biography: 'British-American film director.', placeOfBirth: 'London, England', gender: 'Male' }
];

function generateMockProfile(name, role) {
  const genders = ['Male', 'Female'];
  const gender = genders[Math.floor(Math.random() * genders.length)];
  const nationalities = ['American', 'British', 'Canadian', 'Australian', 'French', 'South Korean', 'Japanese', 'German', 'Spanish', 'Italian'];
  const nationality = nationalities[Math.floor(Math.random() * nationalities.length)];
  const cities = ['New York', 'London', 'Los Angeles', 'Paris', 'Seoul', 'Tokyo', 'Berlin', 'Madrid', 'Rome', 'Sydney', 'Toronto', 'Chicago', 'Miami'];
  const placeOfBirth = `${cities[Math.floor(Math.random() * cities.length)]}, ${nationality === 'American' ? 'USA' : nationality}`;
  
  // Random year between 1950 and 2000
  const year = Math.floor(Math.random() * (2000 - 1950 + 1)) + 1950;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const birthDate = new Date(`${year}-${month}-${day}`);
  
  const biography = `${name} is a renowned ${nationality.toLowerCase()} ${role === 'directing' ? 'director and filmmaker' : 'actor'}. Born in ${placeOfBirth}, they began their career in the early ${year + 20}s and quickly rose to prominence. Known for their incredible range and dedication to the craft, ${name} has become a staple in modern cinema, delivering captivating performances and critically acclaimed projects that resonate with audiences worldwide.`;
  
  // 5% chance to have no avatar natively, but for mock let's just use empty string so UI shows placeholders
  return { gender, nationality, placeOfBirth, birthDate, biography };
}

async function seedPersons() {
  try {
    console.log('Seeding baseline famous persons...');
    const personCache = new Map(); // Mapped by slug -> PersonDoc

    // 1. Seed base famous persons
    for (const p of famousPersons) {
      const slug = slugify(p.name, { lower: true, strict: true });
      let savedPerson = await Person.findOne({ slug });

      if (!savedPerson) {
        savedPerson = await Person.create({ ...p, slug, birthDate: new Date(p.birthDate) });
        console.log(`Created rich person: ${p.name}`);
      }
      personCache.set(slug, savedPerson);
    }

    // 2. Scan databases to extract all legacy strings and automatically build Person docs
    console.log('Scanning database for legacy cast/crew strings...');
    const movies = await Movie.find();
    let createdCount = 0;

    for (const movie of movies) {
      const movieActors = movie.actors || [];
      const movieDirectors = movie.directors || [];
      let isModified = false;

      // Extract actors from legacy "cast" strings
      if (movie.cast && movie.cast.length > 0) {
        for (const castName of movie.cast) {
          if (!castName || typeof castName !== 'string') continue;
          
          const slug = slugify(castName, { lower: true, strict: true });
          if (!slug) continue;
          
          let person = personCache.get(slug);
          if (!person) {
            person = await Person.findOne({ slug });
            if (!person) {
              const mockData = generateMockProfile(castName, 'acting');
              person = await Person.create({ name: castName, slug, knownFor: 'acting', ...mockData });
              createdCount++;
            } else if (!person.biography) {
              // Retrofit existing basic templates with full data
              const mockData = generateMockProfile(person.name, 'acting');
              Object.assign(person, mockData);
              await person.save();
            }
            personCache.set(slug, person);
          }

          if (!movieActors.some(a => a.equals(person._id))) {
            movieActors.push(person._id);
            isModified = true;
          }
        }
      }

      // Extract directors from legacy "director" string
      if (movie.director && typeof movie.director === 'string') {
        // Sometimes directors are comma separated
        const directorsList = movie.director.split(',').map(d => d.trim()).filter(Boolean);
        for (const dirName of directorsList) {
          const dSlug = slugify(dirName, { lower: true, strict: true });
          if (!dSlug) continue;

          let person = personCache.get(dSlug);
          if (!person) {
            person = await Person.findOne({ slug: dSlug });
            if (!person) {
              const mockData = generateMockProfile(dirName, 'directing');
              person = await Person.create({ name: dirName, slug: dSlug, knownFor: 'directing', ...mockData });
              createdCount++;
            } else if (!person.biography) {
              // Retrofit existing basic templates with full data
               const mockData = generateMockProfile(person.name, 'directing');
               Object.assign(person, mockData);
               await person.save();
            }
            personCache.set(dSlug, person);
          }

          if (!movieDirectors.some(d => d.equals(person._id))) {
            movieDirectors.push(person._id);
            isModified = true;
          }
        }
      }

      if (isModified) {
        movie.actors = movieActors;
        movie.directors = movieDirectors;
        await movie.save();
        console.log(`Updated legacy persons for movie: ${movie.title} (${movieActors.length} actors, ${movieDirectors.length} directors)`);
      }
    }

    console.log(`Dynamically auto-created ${createdCount} new Person profiles out of legacy strings!`);
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seedPersons();
