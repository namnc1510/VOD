const config = require('../src/config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../src/config/db');

const Episode = require('../src/models/episode.model');
const Movie = require('../src/models/movie.model');

function parseIntArg(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  const n = Number.parseInt(raw.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseStringArg(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  return raw.slice(prefix.length);
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function randomInt(minInclusive, maxInclusive) {
  const min = Math.ceil(minInclusive);
  const max = Math.floor(maxInclusive);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toSafeString(value) {
  return String(value || '').trim();
}

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');
const MOVIES_LIMIT = clamp(parseIntArg('movies', 30), 1, 500);
const MIN_EPISODES = clamp(parseIntArg('min', 1), 1, 50);
const MAX_EPISODES = clamp(parseIntArg('max', 5), MIN_EPISODES, 200);
const STATUS = toSafeString(parseStringArg('status', 'published')).toLowerCase() || 'published';

async function main() {
  await connectToDatabase(config.mongoUri);

  const movies = await Movie.aggregate([
    { $match: { deletedAt: null } },
    { $sample: { size: MOVIES_LIMIT } },
    { $project: { _id: 1, title: 1, slug: 1, streamUrl: 1 } }
  ]);

  const movieIds = movies.map((m) => m._id);
  const existing = await Episode.find(
    { movie: { $in: movieIds }, deletedAt: null },
    { movie: 1, epNo: 1 },
  ).lean();

  const epNoByMovie = new Map();
  for (const row of existing) {
    const key = String(row.movie);
    if (!epNoByMovie.has(key)) epNoByMovie.set(key, new Set());
    epNoByMovie.get(key).add(Number(row.epNo));
  }

  const docsToInsert = [];
  const summary = {
    mongoUri: config.mongoUri,
    dryRun: DRY_RUN,
    moviesPicked: movies.length,
    moviesWithExistingEpisodes: epNoByMovie.size,
    episodesPlanned: 0,
    episodesInserted: 0,
  };

  for (const movie of movies) {
    const movieId = String(movie._id);
    const wanted = randomInt(MIN_EPISODES, MAX_EPISODES);
    const existingSet = epNoByMovie.get(movieId) || new Set();

    for (let epNo = 1; epNo <= wanted; epNo += 1) {
      if (existingSet.has(epNo)) continue;

      const title = `Episode ${epNo}`;
      const overview = movie.title
        ? `Auto-generated episode ${epNo} for ${movie.title}.`
        : `Auto-generated episode ${epNo}.`;

      docsToInsert.push({
        movie: movie._id,
        epNo,
        title,
        overview,
        durationSeconds: randomInt(18 * 60, 60 * 60),
        status: STATUS,
        streamUrl: toSafeString(movie.streamUrl),
        airDate: new Date(Date.now() - randomInt(0, 90) * 24 * 60 * 60 * 1000),
        deletedAt: null,
      });
      summary.episodesPlanned += 1;
    }
  }

  if (!DRY_RUN && docsToInsert.length > 0) {
    const inserted = await Episode.insertMany(docsToInsert, { ordered: false });
    summary.episodesInserted = inserted.length;
  }

  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectFromDatabase();
    });
}
