const bcrypt = require('bcryptjs');

const config = require('../src/config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../src/config/db');
const Category = require('../src/models/category.model');
const Comment = require('../src/models/comment.model');
const Country = require('../src/models/country.model');
const Format = require('../src/models/format.model');
const Movie = require('../src/models/movie.model');
const Quality = require('../src/models/quality.model');
const rolePermissionService = require('../src/services/role-permission.service');
const Setting = require('../src/models/setting.model');
const User = require('../src/models/user.model');
const Watchlist = require('../src/models/watchlist.model');
const slugify = require('../src/utils/slug');

const SHOULD_RESET = process.argv.includes('--append') ? false : process.env.SEED_RESET !== 'false';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@streamvue.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';
const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL || 'demo@streamvue.local';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo@123456';

function makePoster(slug) {
  return `https://picsum.photos/seed/${slug}-poster/600/900`;
}

function makeBackdrop(slug) {
  return `https://picsum.photos/seed/${slug}-backdrop/1600/900`;
}

function toSlug(title) {
  return slugify(title);
}

function createMovieSeed(data) {
  const slug = toSlug(data.title);
  const genres = data.genres || [];
  const countries = data.countries || [];
  const releaseDate = data.releaseDate ? new Date(data.releaseDate) : undefined;

  const fallbackTrailer = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${data.title} trailer`)}`;
  const fallbackStream = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return {
    slug,
    title: data.title,
    type: data.type || 'movie',
    overview: data.overview,
    genres,
    countries,
    releaseYear: data.releaseYear,
    releaseDate,
    rating: data.imdbRating,
    imdbRating: data.imdbRating,
    durationMinutes: data.durationMinutes,
    quality: data.quality || 'HD',
    audioLanguage: data.language || data.audioLanguage || 'English',
    ageRating: data.ageRating || 'PG-13',
    posterUrl: data.posterUrl || makePoster(slug),
    backdropUrl: data.backdropUrl || makeBackdrop(slug),
    trailerUrl: data.trailerUrl || fallbackTrailer,
    streamUrl: data.streamUrl || fallbackStream,
    director: data.director || '',
    writers: data.writers || [],
    cast: data.cast || [],
    tags: data.tags || [],
    status: data.status || 'released',
    isFeatured: Boolean(data.isFeatured),
    isTrending: Boolean(data.isTrending),
    isNewRelease: Boolean(data.isNewRelease),
    views: data.views || 0,
    trendingScore: data.trendingScore || 0
  };
}

const movieSeeds = [
  createMovieSeed({
    title: 'X-Men: First Class',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'X-Men: Days of Future Past',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Logan',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Deadpool 2',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Deadpool',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Shazam!',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Aquaman',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Wonder Woman',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Man of Steel',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Batman Begins',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'The Batman',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'M:I – Rogue Nation',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'M:I – Ghost Protocol',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Mission: Impossible III',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Mission: Impossible II',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Mission: Impossible',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Raiders of the Lost Ark',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Indiana Jones and the Last Crusade',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'E.T. the Extra-Terrestrial',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Jaws',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Jurassic World',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Jurassic Park',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Coco',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Inside Out',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Up',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Finding Nemo',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Toy Story 3',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Toy Story',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Frozen',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'The Lion King',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'The Social Network',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Se7en',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Fight Club',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'The Green Mile',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Forrest Gump',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'The Shawshank Redemption',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Gladiator',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Titanic',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Avatar: The Way of Water',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Avatar',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Spider-Man: Far From Home',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Spider-Man: Homecoming',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Doctor Strange',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Black Panther',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Guardians of the Galaxy',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Thor',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Captain America: The First Avenger',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Iron Man',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Avengers: Infinity War',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Avengers: Endgame',
    overview: 'A thrilling masterpiece of modern cinema.',
    genres: ['Action', 'Adventure'],
    countries: ['United States'],
    releaseYear: 2020,
    releaseDate: '2020-01-01',
    durationMinutes: 120,
    imdbRating: 8.0,
    quality: 'HD',
    views: 1000000,
    trendingScore: 85
  }),
  createMovieSeed({
    title: 'Inception',
    overview:
      'A professional extractor enters layered dreams to plant an idea that could redefine corporate warfare.',
    genres: ['Sci-Fi', 'Action', 'Thriller'],
    countries: ['United States', 'United Kingdom'],
    releaseYear: 2010,
    releaseDate: '2010-07-16',
    durationMinutes: 148,
    imdbRating: 8.8,
    quality: '4K',
    director: 'Christopher Nolan',
    writers: ['Christopher Nolan'],
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    tags: ['mind-bending', 'dream', 'heist'],
    isFeatured: true,
    isTrending: true,
    views: 3100000,
    trendingScore: 98
  }),
  createMovieSeed({
    title: 'Interstellar',
    overview:
      'A former pilot travels through a wormhole with a team of scientists to secure humanity’s survival.',
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    countries: ['United States', 'United Kingdom'],
    releaseYear: 2014,
    releaseDate: '2014-11-07',
    durationMinutes: 169,
    imdbRating: 8.7,
    quality: '4K',
    director: 'Christopher Nolan',
    writers: ['Jonathan Nolan', 'Christopher Nolan'],
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    tags: ['space', 'time dilation', 'emotional'],
    isTrending: true,
    views: 2800000,
    trendingScore: 94
  }),
  createMovieSeed({
    title: 'The Dark Knight',
    overview: 'Batman faces the Joker in a battle that tests Gotham’s moral boundaries.',
    genres: ['Action', 'Crime', 'Drama'],
    countries: ['United States'],
    releaseYear: 2008,
    releaseDate: '2008-07-18',
    durationMinutes: 152,
    imdbRating: 9.0,
    quality: 'HD',
    director: 'Christopher Nolan',
    writers: ['Jonathan Nolan', 'Christopher Nolan'],
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
    tags: ['superhero', 'dc', 'joker'],
    isTrending: true,
    views: 3500000,
    trendingScore: 99
  }),
  createMovieSeed({
    title: 'Parasite',
    overview:
      'A low-income family infiltrates a wealthy household, triggering a tense and unpredictable chain of events.',
    genres: ['Drama', 'Thriller'],
    countries: ['South Korea'],
    releaseYear: 2019,
    releaseDate: '2019-05-30',
    durationMinutes: 132,
    imdbRating: 8.5,
    quality: 'HD',
    language: 'Korean',
    director: 'Bong Joon-ho',
    writers: ['Bong Joon-ho', 'Han Jin-won'],
    cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong'],
    tags: ['oscar', 'social satire', 'thriller'],
    isTrending: true,
    views: 2100000,
    trendingScore: 90
  }),
  createMovieSeed({
    title: 'Joker',
    overview: 'A struggling comedian’s descent into madness sparks unrest across Gotham City.',
    genres: ['Crime', 'Drama', 'Thriller'],
    countries: ['United States'],
    releaseYear: 2019,
    releaseDate: '2019-10-04',
    durationMinutes: 122,
    imdbRating: 8.4,
    quality: 'HD',
    director: 'Todd Phillips',
    writers: ['Todd Phillips', 'Scott Silver'],
    cast: ['Joaquin Phoenix', 'Robert De Niro', 'Zazie Beetz'],
    tags: ['origin story', 'psychological'],
    isTrending: true,
    views: 2050000,
    trendingScore: 88
  }),
  createMovieSeed({
    title: 'Dune: Part Two',
    overview: 'Paul Atreides unites with the Fremen to challenge the empire controlling Arrakis.',
    genres: ['Sci-Fi', 'Adventure'],
    countries: ['United States', 'Canada'],
    releaseYear: 2024,
    releaseDate: '2024-03-01',
    durationMinutes: 166,
    imdbRating: 8.0,
    quality: '4K',
    director: 'Denis Villeneuve',
    writers: ['Denis Villeneuve', 'Jon Spaihts'],
    cast: ['Timothee Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    tags: ['desert', 'epic', 'franchise'],
    isNewRelease: true,
    isTrending: true,
    views: 1400000,
    trendingScore: 87
  }),
  createMovieSeed({
    title: 'Oppenheimer',
    overview: 'The life and ethical conflict of the physicist who led the Manhattan Project.',
    genres: ['Biography', 'History', 'Drama'],
    countries: ['United States', 'United Kingdom'],
    releaseYear: 2023,
    releaseDate: '2023-07-21',
    durationMinutes: 180,
    imdbRating: 8.6,
    quality: '4K',
    director: 'Christopher Nolan',
    writers: ['Christopher Nolan'],
    cast: ['Cillian Murphy', 'Emily Blunt', 'Robert Downey Jr.'],
    tags: ['history', 'war', 'biography'],
    isNewRelease: true,
    views: 1700000,
    trendingScore: 86
  }),
  createMovieSeed({
    title: 'Barbie',
    overview: 'Barbie and Ken leave Barbieland and discover the complexity of the real world.',
    genres: ['Comedy', 'Adventure', 'Fantasy'],
    countries: ['United States'],
    releaseYear: 2023,
    releaseDate: '2023-07-21',
    durationMinutes: 114,
    imdbRating: 7.1,
    quality: 'HD',
    director: 'Greta Gerwig',
    writers: ['Greta Gerwig', 'Noah Baumbach'],
    cast: ['Margot Robbie', 'Ryan Gosling', 'America Ferrera'],
    tags: ['comedy', 'blockbuster'],
    isNewRelease: true,
    views: 1600000,
    trendingScore: 84
  }),
  createMovieSeed({
    title: 'The Zone of Interest',
    overview: 'A family tries to build a normal life next to Auschwitz, exposing chilling moral blindness.',
    genres: ['Drama', 'History'],
    countries: ['United Kingdom', 'Poland'],
    releaseYear: 2023,
    releaseDate: '2023-12-15',
    durationMinutes: 105,
    imdbRating: 7.9,
    quality: 'HD',
    director: 'Jonathan Glazer',
    writers: ['Jonathan Glazer'],
    cast: ['Sandra Huller', 'Christian Friedel'],
    tags: ['arthouse', 'history'],
    isNewRelease: true,
    views: 620000,
    trendingScore: 71
  }),
  createMovieSeed({
    title: 'Civil War',
    overview: 'A team of journalists crosses a fractured America to capture the truth in a near-future conflict.',
    genres: ['Action', 'Drama', 'Thriller'],
    countries: ['United States'],
    releaseYear: 2024,
    releaseDate: '2024-04-12',
    durationMinutes: 109,
    imdbRating: 7.4,
    quality: '4K',
    director: 'Alex Garland',
    writers: ['Alex Garland'],
    cast: ['Kirsten Dunst', 'Cailee Spaeny', 'Wagner Moura'],
    tags: ['war', 'journalism'],
    isNewRelease: true,
    views: 780000,
    trendingScore: 76
  }),
  createMovieSeed({
    title: 'Blade Runner 2049',
    overview: 'A young blade runner uncovers a secret that could destabilize what remains of society.',
    genres: ['Sci-Fi', 'Mystery', 'Thriller'],
    countries: ['United States', 'Canada'],
    releaseYear: 2017,
    releaseDate: '2017-10-06',
    durationMinutes: 164,
    imdbRating: 8.0,
    quality: '4K',
    director: 'Denis Villeneuve',
    writers: ['Hampton Fancher', 'Michael Green'],
    cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas'],
    tags: ['neo-noir', 'cyberpunk'],
    views: 1200000,
    trendingScore: 79
  }),
  createMovieSeed({
    title: 'Mad Max: Fury Road',
    overview: 'In a desert wasteland, Max teams up with Furiosa in a high-octane escape.',
    genres: ['Action', 'Adventure'],
    countries: ['Australia', 'United States'],
    releaseYear: 2015,
    releaseDate: '2015-05-15',
    durationMinutes: 120,
    imdbRating: 8.1,
    quality: 'HD',
    director: 'George Miller',
    writers: ['George Miller', 'Brendan McCarthy'],
    cast: ['Tom Hardy', 'Charlize Theron', 'Nicholas Hoult'],
    tags: ['post-apocalyptic', 'road chase'],
    views: 1350000,
    trendingScore: 80
  }),
  createMovieSeed({
    title: 'Gravity',
    overview: 'Two astronauts struggle to survive after debris destroys their space shuttle.',
    genres: ['Sci-Fi', 'Thriller', 'Drama'],
    countries: ['United States', 'United Kingdom'],
    releaseYear: 2013,
    releaseDate: '2013-10-04',
    durationMinutes: 91,
    imdbRating: 7.7,
    quality: 'HD',
    director: 'Alfonso Cuaron',
    writers: ['Alfonso Cuaron', 'Jonas Cuaron'],
    cast: ['Sandra Bullock', 'George Clooney'],
    tags: ['space survival'],
    views: 940000,
    trendingScore: 67
  }),
  createMovieSeed({
    title: 'The Martian',
    overview: 'An astronaut stranded on Mars must survive and find a way to signal Earth.',
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    countries: ['United States'],
    releaseYear: 2015,
    releaseDate: '2015-10-02',
    durationMinutes: 144,
    imdbRating: 8.0,
    quality: 'HD',
    director: 'Ridley Scott',
    writers: ['Drew Goddard'],
    cast: ['Matt Damon', 'Jessica Chastain', 'Chiwetel Ejiofor'],
    tags: ['mars', 'science'],
    views: 1020000,
    trendingScore: 72
  }),
  createMovieSeed({
    title: 'Tenet',
    overview: 'A covert agent manipulates time inversion to prevent global catastrophe.',
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    countries: ['United States', 'United Kingdom'],
    releaseYear: 2020,
    releaseDate: '2020-08-26',
    durationMinutes: 150,
    imdbRating: 7.3,
    quality: '4K',
    director: 'Christopher Nolan',
    writers: ['Christopher Nolan'],
    cast: ['John David Washington', 'Robert Pattinson', 'Elizabeth Debicki'],
    tags: ['time', 'spy'],
    views: 990000,
    trendingScore: 68
  }),
  createMovieSeed({
    title: 'Arrival',
    overview: 'A linguist is recruited to communicate with extraterrestrials visiting Earth.',
    genres: ['Sci-Fi', 'Drama', 'Mystery'],
    countries: ['United States', 'Canada'],
    releaseYear: 2016,
    releaseDate: '2016-11-11',
    durationMinutes: 116,
    imdbRating: 7.9,
    quality: 'HD',
    director: 'Denis Villeneuve',
    writers: ['Eric Heisserer'],
    cast: ['Amy Adams', 'Jeremy Renner', 'Forest Whitaker'],
    tags: ['aliens', 'linguistics'],
    views: 980000,
    trendingScore: 70
  }),
  createMovieSeed({
    title: 'Whiplash',
    overview: 'An ambitious drummer clashes with a ruthless jazz instructor.',
    genres: ['Drama', 'Music'],
    countries: ['United States'],
    releaseYear: 2014,
    releaseDate: '2014-10-10',
    durationMinutes: 106,
    imdbRating: 8.5,
    quality: 'HD',
    director: 'Damien Chazelle',
    writers: ['Damien Chazelle'],
    cast: ['Miles Teller', 'J.K. Simmons'],
    tags: ['music', 'intense'],
    views: 1100000,
    trendingScore: 77
  }),
  createMovieSeed({
    title: 'The Matrix',
    overview: 'A hacker discovers reality is a simulation and joins a rebellion against machines.',
    genres: ['Action', 'Sci-Fi'],
    countries: ['United States', 'Australia'],
    releaseYear: 1999,
    releaseDate: '1999-03-31',
    durationMinutes: 136,
    imdbRating: 8.7,
    quality: 'HD',
    director: 'The Wachowskis',
    writers: ['The Wachowskis'],
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    tags: ['cyberpunk', 'classic'],
    views: 2500000,
    trendingScore: 91
  }),
  createMovieSeed({
    title: 'Pulp Fiction',
    overview: 'Intertwined crime stories unfold in Los Angeles with dark humor and style.',
    genres: ['Crime', 'Drama'],
    countries: ['United States'],
    releaseYear: 1994,
    releaseDate: '1994-10-14',
    durationMinutes: 154,
    imdbRating: 8.9,
    quality: 'HD',
    director: 'Quentin Tarantino',
    writers: ['Quentin Tarantino', 'Roger Avary'],
    cast: ['John Travolta', 'Samuel L. Jackson', 'Uma Thurman'],
    tags: ['cult', 'crime'],
    views: 2200000,
    trendingScore: 89
  }),
  createMovieSeed({
    title: 'Dark Matter Protocol',
    type: 'series',
    overview: 'A former astronaut leads a covert team investigating anomalies across parallel timelines.',
    genres: ['Sci-Fi', 'Mystery'],
    countries: ['United States'],
    releaseYear: 2025,
    releaseDate: '2025-01-09',
    durationMinutes: 52,
    imdbRating: 8.2,
    quality: '4K',
    director: 'Nia Dao',
    writers: ['Liam Carter', 'Mia Nguyen'],
    cast: ['Ava Lin', 'Marcus Bell', 'Theo Grant'],
    tags: ['series', 'time', 'multiverse'],
    isNewRelease: true,
    status: 'released',
    views: 580000,
    trendingScore: 82
  }),
  createMovieSeed({
    title: 'Silent Witness',
    overview: 'A forensic analyst uncovers a conspiracy while investigating a serial murder case.',
    genres: ['Thriller', 'Drama'],
    countries: ['United Kingdom'],
    releaseYear: 2024,
    releaseDate: '2024-05-17',
    durationMinutes: 125,
    imdbRating: 8.2,
    quality: 'HD',
    director: 'Emma Rhodes',
    writers: ['Aidan Cole'],
    cast: ['Olivia Stone', 'Henry Walsh'],
    tags: ['crime', 'investigation'],
    isNewRelease: true,
    views: 430000,
    trendingScore: 64
  }),
  createMovieSeed({
    title: 'Forest Kingdom',
    overview: 'A young explorer uncovers the secrets of a mythical forest realm.',
    genres: ['Animation', 'Adventure', 'Family'],
    countries: ['Japan'],
    releaseYear: 2023,
    releaseDate: '2023-09-14',
    durationMinutes: 92,
    imdbRating: 8.1,
    quality: 'HD',
    language: 'Japanese',
    director: 'Yuki Harada',
    writers: ['Rin Takahashi'],
    cast: ['Aoi Kanda', 'Sora Ishikawa'],
    tags: ['animation', 'family'],
    isNewRelease: true,
    views: 520000,
    trendingScore: 69
  }),
  createMovieSeed({
    title: 'Beyond the Horizon',
    overview: 'A crew of explorers travels beyond known space after detecting a mysterious beacon.',
    genres: ['Sci-Fi', 'Adventure'],
    countries: ['Canada'],
    releaseYear: 2024,
    releaseDate: '2024-02-20',
    durationMinutes: 130,
    imdbRating: 8.5,
    quality: '4K',
    director: 'Noah Peterson',
    writers: ['Noah Peterson', 'Ivy Miller'],
    cast: ['Ethan Brooks', 'Jade Kim'],
    tags: ['space', 'adventure'],
    isNewRelease: true,
    isTrending: true,
    views: 970000,
    trendingScore: 83
  }),
  createMovieSeed({
    title: 'City of Neon',
    overview: 'An ex-detective navigates a neon-soaked megacity to expose a corruption network.',
    genres: ['Action', 'Crime'],
    countries: ['France'],
    releaseYear: 2022,
    releaseDate: '2022-10-05',
    durationMinutes: 118,
    imdbRating: 7.9,
    quality: 'HD',
    director: 'Luc Martel',
    writers: ['Luc Martel', 'Eva Delon'],
    cast: ['Rene Vaillant', 'Sophie Duran'],
    tags: ['neo-noir', 'crime'],
    views: 640000,
    trendingScore: 62
  }),
  createMovieSeed({
    title: 'The Last Echo',
    overview: 'A courtroom drama where a forgotten recording changes the fate of a high-profile trial.',
    genres: ['Drama', 'Mystery'],
    countries: ['Germany'],
    releaseYear: 2021,
    releaseDate: '2021-11-11',
    durationMinutes: 132,
    imdbRating: 9.1,
    quality: 'HD',
    director: 'Hanna Schmitt',
    writers: ['Hanna Schmitt'],
    cast: ['Marta Klein', 'Jonas Adler'],
    tags: ['courtroom', 'drama'],
    views: 590000,
    trendingScore: 66
  })
];

const commentMessages = [
  'Visual quality is stunning. This one is perfect for a 4K screen.',
  'Plot pacing is great and the cast chemistry feels natural.',
  'Sound design is excellent, especially in the intense scenes.',
  'Strong recommendation if you enjoy character-driven storytelling.',
  'The ending surprised me in a good way.',
  'This deserves to stay in the trending section.',
  'Production quality is top tier from start to finish.'
];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function seedUsers() {
  const hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const hashedDemoPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const hashedCommonPassword = await bcrypt.hash('User@123456', 10);

  const userSeeds = [
    {
      name: 'Stream Admin',
      email: ADMIN_EMAIL,
      role: 'admin',
      plan: 'premium',
      avatarUrl: 'https://picsum.photos/seed/stream-admin/200/200',
      passwordHash: hashedAdminPassword,
      watchedCount: 320
    },
    {
      name: 'System Super',
      email: 'super@streamvue.local',
      role: 'super',
      plan: 'ultimate',
      avatarUrl: 'https://picsum.photos/seed/system-super/200/200',
      passwordHash: hashedAdminPassword,
      watchedCount: 999
    },
    {
      name: 'Content Editor',
      email: 'editor@streamvue.local',
      role: 'editor',
      plan: 'ultimate',
      avatarUrl: 'https://picsum.photos/seed/content-editor/200/200',
      passwordHash: hashedAdminPassword,
      watchedCount: 156
    },
    {
      name: 'Community Mod',
      email: 'moderator@streamvue.local',
      role: 'moderator',
      plan: 'premium',
      avatarUrl: 'https://picsum.photos/seed/community-mod/200/200',
      passwordHash: hashedAdminPassword,
      watchedCount: 88
    },
    {
      name: 'Alex Johnson',
      email: DEMO_EMAIL,
      role: 'user',
      plan: 'premium',
      avatarUrl: 'https://picsum.photos/seed/alex-johnson/200/200',
      passwordHash: hashedDemoPassword,
      watchedCount: 128
    },
    {
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@streamvue.local',
      role: 'user',
      plan: 'premium',
      avatarUrl: 'https://picsum.photos/seed/sarah-jenkins/200/200',
      passwordHash: hashedCommonPassword,
      watchedCount: 94
    },
    {
      name: 'Michael Rivera',
      email: 'michael.rivera@streamvue.local',
      role: 'user',
      plan: 'free',
      avatarUrl: 'https://picsum.photos/seed/michael-rivera/200/200',
      passwordHash: hashedCommonPassword,
      watchedCount: 73
    },
    {
      name: 'Lina Park',
      email: 'lina.park@streamvue.local',
      role: 'user',
      plan: 'premium',
      avatarUrl: 'https://picsum.photos/seed/lina-park/200/200',
      passwordHash: hashedCommonPassword,
      watchedCount: 101
    },
    {
      name: 'Daniel Kim',
      email: 'daniel.kim@streamvue.local',
      role: 'user',
      plan: 'free',
      avatarUrl: 'https://picsum.photos/seed/daniel-kim/200/200',
      passwordHash: hashedCommonPassword,
      watchedCount: 44
    },
    {
      name: 'Emma Watson',
      email: 'emma.watson@streamvue.local',
      role: 'user',
      plan: 'premium',
      avatarUrl: 'https://picsum.photos/seed/emma-watson/200/200',
      passwordHash: hashedCommonPassword,
      watchedCount: 87
    }
  ];

  for (const user of userSeeds) {
    await User.updateOne(
      { email: user.email },
      {
        $set: {
          name: user.name,
          role: user.role,
          plan: user.plan,
          avatarUrl: user.avatarUrl,
          watchedCount: user.watchedCount,
          passwordHash: user.passwordHash
        }
      },
      { upsert: true }
    );
  }

  const users = await User.find({ email: { $in: userSeeds.map((item) => item.email) } }).lean();
  const usersByEmail = new Map(users.map((user) => [user.email, user]));

  return {
    users,
    adminUser: usersByEmail.get(ADMIN_EMAIL),
    demoUser: usersByEmail.get(DEMO_EMAIL),
    commentUsers: users.filter((user) => user.role === 'user')
  };
}

async function seedMovies() {
  const uniqueGenres = new Set();
  const uniqueCountries = new Set();
  const uniqueQualities = new Set();
  const uniqueFormats = new Set();
  for (const item of movieSeeds) {
    (item.genres || []).forEach(g => uniqueGenres.add(g));
    (item.countries || []).forEach(c => uniqueCountries.add(c));
    if (item.quality) uniqueQualities.add(String(item.quality).trim());
    if (item.type) uniqueFormats.add(String(item.type).trim());
  }

  if (uniqueGenres.size > 0) {
    await Category.bulkWrite(Array.from(uniqueGenres).map(name => ({
      updateOne: { filter: { name }, update: { $set: { name, slug: slugify(name) } }, upsert: true }
    })));
  }

  if (uniqueCountries.size > 0) {
    await Country.bulkWrite(Array.from(uniqueCountries).map(name => ({
      updateOne: { filter: { name }, update: { $set: { name, slug: slugify(name) } }, upsert: true }
    })));
  }

  if (uniqueQualities.size > 0) {
    await Quality.bulkWrite(Array.from(uniqueQualities).map((name) => ({
      updateOne: { filter: { name }, update: { $set: { name, slug: slugify(name) } }, upsert: true }
    })));
  }

  if (uniqueFormats.size > 0) {
    await Format.bulkWrite(Array.from(uniqueFormats).map((type) => ({
      updateOne: {
        filter: { slug: slugify(type) },
        update: { $set: { name: type, slug: slugify(type) } },
        upsert: true
      }
    })));
  }

  const categories = await Category.find().lean();
  const catMap = new Map(categories.map(c => [c.name, c._id]));
  
  const countries = await Country.find().lean();
  const couMap = new Map(countries.map(c => [c.name, c._id]));

  const qualities = await Quality.find().lean();
  const qualityMap = new Map(qualities.map((q) => [String(q.name).toLowerCase(), q]));

  const formats = await Format.find().lean();
  const formatMap = new Map(formats.map((f) => [String(f.slug).toLowerCase(), f]));

  for (const movie of movieSeeds) {
    const movieData = { ...movie };
    movieData.genres = (movieData.genres || []).map(g => catMap.get(g)).filter(Boolean);
    movieData.countries = (movieData.countries || []).map(c => couMap.get(c)).filter(Boolean);

    const q = qualityMap.get(String(movieData.quality || 'HD').toLowerCase());
    if (q?._id) {
      movieData.qualityRef = q._id;
      movieData.quality = q.name;
    }

    const formatSlug = slugify(movieData.type || 'movie');
    const f = formatMap.get(String(formatSlug).toLowerCase());
    if (f?._id) {
      movieData.formatRef = f._id;
      movieData.type = f.slug;
    }

    await Movie.updateOne({ slug: movie.slug }, { $set: movieData }, { upsert: true });
  }

  const movies = await Movie.find({ slug: { $in: movieSeeds.map((item) => item.slug) } }).lean();
  return movies;
}

async function seedComments(movies, users) {
  const commentDocs = [];

  const targetMovies = movies
    .sort((a, b) => b.imdbRating - a.imdbRating)
    .slice(0, 12);

  for (const movie of targetMovies) {
    const commentCount = 2 + Math.floor(Math.random() * 4);
    for (let index = 0; index < commentCount; index += 1) {
      const user = pickRandom(users);
      commentDocs.push({
        movie: movie._id,
        user: user._id,
        content: pickRandom(commentMessages),
        status: 'approved',
        hidden: false,
        deletedAt: null,
        likesCount: 5 + Math.floor(Math.random() * 120),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000)),
        updatedAt: new Date()
      });
    }
  }

  if (commentDocs.length > 0) {
    await Comment.insertMany(commentDocs);
  }
}

async function seedWatchlists(movies, demoUser, users) {
  const watchlistOps = [];
  const pool = movies.sort((a, b) => b.imdbRating - a.imdbRating);
  const deviceTypes = ['desktop', 'mobile', 'tv', 'unknown'];

  const demoMovies = pool.slice(0, 12);
  for (const movie of demoMovies) {
      watchlistOps.push({
        updateOne: {
          filter: { user: demoUser._id, movie: movie._id },
          update: {
            $set: {
              progressSeconds: 300 + Math.floor(Math.random() * 7200),
              isCompleted: Math.random() > 0.7,
              deviceType: pickRandom(deviceTypes),
              lastWatchedAt: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000))
            }
          },
          upsert: true
        }
      });
  }

  for (const user of users) {
    const randomCount = 2 + Math.floor(Math.random() * 4);
    for (let index = 0; index < randomCount; index += 1) {
      const movie = pickRandom(pool);
      watchlistOps.push({
        updateOne: {
          filter: { user: user._id, movie: movie._id },
          update: {
            $set: {
              progressSeconds: Math.floor(Math.random() * 5400),
              isCompleted: Math.random() > 0.8,
              deviceType: pickRandom(deviceTypes),
              lastWatchedAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
            }
          },
          upsert: true
        }
      });
    }
  }

  if (watchlistOps.length > 0) {
    await Watchlist.bulkWrite(watchlistOps);
  }
}

async function updateWatchedCounts() {
  const aggregation = await Watchlist.aggregate([{ $group: { _id: '$user', count: { $sum: 1 } } }]);

  for (const item of aggregation) {
    await User.updateOne({ _id: item._id }, { $set: { watchedCount: item.count * 8 } });
  }
}

async function run() {
  try {
    await connectToDatabase(config.mongoUri);

    if (SHOULD_RESET) {
      await Promise.all([
        Watchlist.deleteMany({}),
        Comment.deleteMany({}),
        Movie.deleteMany({}),
        User.deleteMany({}),
        Category.deleteMany({}),
        Country.deleteMany({}),
        Quality.deleteMany({}),
        Format.deleteMany({}),
        Setting.deleteMany({}),
        require('../src/models/role-permission.model').deleteMany({}),
      ]);
    }

    const { adminUser, demoUser, commentUsers } = await seedUsers();
    const movies = await seedMovies();

    // Ensure settings exist with a sensible hero list for the home page.
    const heroIds = movies
      .filter((m) => m && m._id)
      .slice(0, 6)
      .map((m) => m._id);
    await Setting.updateOne(
      { key: 'default' },
      {
        $setOnInsert: { key: 'default' },
        $set: {
          homeHeroMovieIds: heroIds,
          homeHeroLimit: 6,
          homeHeroAutofill: true,
        },
      },
      { upsert: true },
    );

    // Ensure role permissions exist with defaults.
    await rolePermissionService.listRolePermissions();

    await seedWatchlists(movies, demoUser, commentUsers);
    await seedComments(movies, commentUsers);
    await updateWatchedCounts();

    const [movieCount, userCount, commentCount, watchlistCount] = await Promise.all([
      Movie.countDocuments(),
      User.countDocuments(),
      Comment.countDocuments(),
      Watchlist.countDocuments()
    ]);

    console.log('Seed completed successfully.');
    console.log(`Database: ${config.mongoUri}`);
    console.log(`Movies: ${movieCount}`);
    console.log(`Users: ${userCount}`);
    console.log(`Comments: ${commentCount}`);
    console.log(`Watchlist items: ${watchlistCount}`);
    console.log('Demo credentials:');
    console.log(`- Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`- User: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    if (!adminUser || !demoUser) {
      console.warn('Warning: demo users were not created as expected.');
    }
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectFromDatabase();
  }
}

if (require.main === module) {
  run();
}
