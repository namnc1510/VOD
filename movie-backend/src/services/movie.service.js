const mongoose = require('mongoose');
const Movie = require('../models/movie.model');
const Category = require('../models/category.model');
const Country = require('../models/country.model');
const Quality = require('../models/quality.model');
const Format = require('../models/format.model');
const Person = require('../models/person.model');
const HttpError = require('../utils/http-error');
const slugify = require('../utils/slug');
const {
  escapeRegExp,
  parseBoolean,
  parseCsvList,
  parseNumericFilter,
  parsePagination,
  parseSearch,
  parseSort
} = require('../utils/query');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const FALLBACK_ACTOR_POOL = [
  'Leonardo DiCaprio',
  'Scarlett Johansson',
  'Robert Downey Jr.',
  'Tom Hanks',
  'Meryl Streep',
  'Denzel Washington',
  'Brie Larson',
  'Kang-ho Song',
  'Zendaya',
  'Ryan Reynolds',
  'Florence Pugh',
  'Timothee Chalamet',
  'Ana de Armas',
  'John Boyega',
  'Oscar Isaac',
  'Margot Robbie',
  'Emily Blunt',
  'Dev Patel',
  'Lupita Nyong\'o',
  'Pedro Pascal'
];
const FALLBACK_DIRECTOR_POOL = [
  'Christopher Nolan',
  'Steven Spielberg',
  'Martin Scorsese',
  'Quentin Tarantino',
  'Greta Gerwig',
  'Bong Joon-ho',
  'Denis Villeneuve',
  'Patty Jenkins',
  'Damien Chazelle',
  'Jordan Peele',
  'Ryan Coogler',
  'Sofia Coppola'
];

function hashString(input) {
  let hash = 0;
  const source = String(input || '');

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function normalizeLegacyNames(input) {
  const source = Array.isArray(input) ? input : input ? [input] : [];
  const seen = new Set();

  return source
    .flatMap((item) => String(item || '').split(','))
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function pickSeedItems(pool, count, seed) {
  if (!Array.isArray(pool) || pool.length === 0 || count <= 0) return [];

  const size = Math.min(count, pool.length);
  const result = [];
  const seen = new Set();
  let index = hashString(seed) % pool.length;
  const step = pool.length > 1 ? (hashString(`${seed}-step`) % (pool.length - 1)) + 1 : 1;

  while (result.length < size) {
    const candidate = pool[index % pool.length];
    if (!seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate);
    }
    index += step;
  }

  return result;
}

async function findOrCreatePersonByName(name, role) {
  const trimmed = toTrimmedString(name);
  if (!trimmed) return null;

  const slug = slugify(trimmed);
  if (!slug) return null;

  await Person.updateOne(
    { slug },
    {
      $setOnInsert: {
        name: trimmed,
        slug,
        biography: `${trimmed} is featured in the StreamVue catalog.`,
        avatarUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(slug)}`
      },
      $addToSet: {
        knownFor: role
      }
    },
    { upsert: true }
  );

  return Person.findOne({ slug })
    .select('_id name slug avatarUrl biography knownFor')
    .lean();
}

async function ensureMovieCredits(movie) {
  if (!movie?._id) return movie;

  const linkedActors = Array.isArray(movie.actors) ? movie.actors.filter((item) => item && item.name) : [];
  const linkedDirectors = Array.isArray(movie.directors) ? movie.directors.filter((item) => item && item.name) : [];

  const legacyCast = normalizeLegacyNames(movie.cast);
  const legacyDirectors = normalizeLegacyNames(movie.director);

  const castNames = legacyCast.length > 0
    ? legacyCast
    : linkedActors.length > 0
      ? linkedActors.map((item) => item.name)
      : pickSeedItems(FALLBACK_ACTOR_POOL, 3, `${movie.slug}-cast`);
  const directorNames = legacyDirectors.length > 0
    ? legacyDirectors
    : linkedDirectors.length > 0
      ? linkedDirectors.map((item) => item.name)
      : pickSeedItems(FALLBACK_DIRECTOR_POOL, 1, `${movie.slug}-director`);

  const actorDocs = linkedActors.length > 0
    ? linkedActors
    : await Promise.all(castNames.map((name) => findOrCreatePersonByName(name, 'acting')));
  const directorDocs = linkedDirectors.length > 0
    ? linkedDirectors
    : await Promise.all(directorNames.map((name) => findOrCreatePersonByName(name, 'directing')));

  const safeActors = actorDocs.filter(Boolean);
  const safeDirectors = directorDocs.filter(Boolean);
  const updateData = {};

  if (legacyCast.length === 0 && castNames.length > 0) {
    updateData.cast = castNames;
  }
  if (legacyDirectors.length === 0 && directorNames.length > 0) {
    updateData.director = directorNames.join(', ');
  }
  if ((!Array.isArray(movie.actors) || movie.actors.length === 0) && safeActors.length > 0) {
    updateData.actors = safeActors.map((item) => item._id);
  }
  if ((!Array.isArray(movie.directors) || movie.directors.length === 0) && safeDirectors.length > 0) {
    updateData.directors = safeDirectors.map((item) => item._id);
  }

  if (Object.keys(updateData).length > 0) {
    await Movie.updateOne({ _id: movie._id }, { $set: updateData });
  }

  return {
    ...movie,
    cast: castNames,
    director: directorNames.join(', '),
    actors: safeActors,
    directors: safeDirectors
  };
}

function normalizeMovieStatus(input) {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (!raw) return null;

  // Import/backward-compat mappings.
  if (raw === 'published') return 'released';
  if (raw === 'unpublished' || raw === 'private') return 'hidden';
  if (raw === 'draft' || raw === 'scheduled' || raw === 'comingsoon' || raw === 'upcoming') return 'coming_soon';

  if (['released', 'coming_soon', 'hidden'].includes(raw)) return raw;
  return null;
}

function toObjectIdString(value) {
  if (!value) return null;

  if (typeof value === 'string') {
    return mongoose.Types.ObjectId.isValid(value) ? value : null;
  }

  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    if (typeof value.toString === 'function') {
      const s = String(value.toString());
      return mongoose.Types.ObjectId.isValid(s) ? s : null;
    }
  }

  return null;
}

function toTrimmedString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function isObjectIdLike(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

async function findOrCreateTaxonomyByName(Model, name) {
  const trimmed = toTrimmedString(name);
  if (!trimmed) return null;

  const baseSlug = slugify(trimmed);
  if (!baseSlug) return null;

  const existing = await Model.findOne({
    $or: [
      { slug: baseSlug },
      { name: new RegExp(`^${escapeRegExp(trimmed)}$`, 'i') }
    ]
  })
    .select('_id name slug')
    .lean();

  if (existing) return existing;

  let slug = baseSlug;
  let counter = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  const created = await Model.create({ name: trimmed, slug });
  return created.toObject ? created.toObject() : created;
}

async function resolveTaxonomyRef(Model, input) {
  const raw = toTrimmedString(input);
  if (!raw) return null;

  if (isObjectIdLike(raw)) {
    const doc = await Model.findById(raw).select('_id name slug').lean();
    return doc || null;
  }

  const s = slugify(raw);
  const doc = await Model.findOne({
    $or: [
      { slug: s },
      { name: new RegExp(`^${escapeRegExp(raw)}$`, 'i') }
    ]
  })
    .select('_id name slug')
    .lean();

  if (doc) return doc;
  return findOrCreateTaxonomyByName(Model, raw);
}

async function resolveTaxonomyIds(Model, listOrSingle) {
  const values = Array.isArray(listOrSingle) ? listOrSingle : listOrSingle !== undefined ? [listOrSingle] : [];
  const out = [];

  for (const v of values) {
    const s = toTrimmedString(v);
    if (!s) continue;
    if (isObjectIdLike(s)) {
      out.push(s);
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const doc = await findOrCreateTaxonomyByName(Model, s);
    if (doc?._id) out.push(String(doc._id));
  }

  return out;
}

function mapMovieSummary(movie) {
  const qualityFromRef =
    movie.qualityRef && typeof movie.qualityRef === 'object' ? movie.qualityRef.name : undefined;
  const formatFromRef =
    movie.formatRef && typeof movie.formatRef === 'object' ? movie.formatRef.slug : undefined;

  return {
    id: movie._id.toString(),
    title: movie.title,
    slug: movie.slug,
    type: formatFromRef || movie.type,
    overview: movie.overview,
    genre: movie.genre || (movie.genres && typeof movie.genres[0] === 'object' ? movie.genres[0]?.name : undefined),
    genres: movie.genres ? movie.genres.map(g => typeof g === 'object' ? g.name : g) : [],
    countries: movie.countries ? movie.countries.map(c => typeof c === 'object' ? c.name : c) : [],
    releaseYear: movie.releaseYear,
    releaseDate: movie.releaseDate,
    actors: movie.actors || [],
    directors: movie.directors || [],
    rating: movie.rating,
    imdbRating: movie.imdbRating,
    quality: qualityFromRef || movie.quality,
    qualityId: toObjectIdString(movie.qualityRef),
    formatId: toObjectIdString(movie.formatRef),
    language: movie.audioLanguage,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    trailerUrl: movie.trailerUrl,
    streamUrl: movie.streamUrl,
    accessMode: movie.accessMode || 'free',
    gallery: Array.isArray(movie.gallery) ? movie.gallery : [],
    tags: Array.isArray(movie.tags) ? movie.tags : [],
    director: movie.director,
    durationMinutes: movie.durationMinutes,
    status: movie.status,
    isFeatured: movie.isFeatured,
    isTrending: movie.isTrending,
    isNewRelease: movie.isNewRelease,
    views: movie.views,
    trendingScore: movie.trendingScore,
    deletedAt: movie.deletedAt,
    createdAt: movie.createdAt,
    updatedAt: movie.updatedAt
  };
}

function mapMovieDetail(movie) {
  return {
    ...mapMovieSummary(movie),
    language: movie.audioLanguage,
    ageRating: movie.ageRating,
    trailerUrl: movie.trailerUrl,
    streamUrl: movie.streamUrl,
    tags: movie.tags,
    director: movie.director,
    writers: movie.writers,
    cast: movie.cast,
    cast: movie.cast || [],
    writers: movie.writers || [],
    actors: movie.actors || [],
    directors: movie.directors || [],
  };
}

async function listMovies(query) {
  const { page, limit, skip } = parsePagination(query, {
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    maxLimit: MAX_LIMIT
  });
  const search = parseSearch(query);
  const sort = parseSort(query, {
    field: 'createdAt',
    order: -1,
    allowedFields: ['createdAt', 'title', 'releaseYear', 'rating', 'imdbRating', 'views', 'trendingScore']
  });

  const filters = {};
  const andConditions = [];

  // By default, hide soft-deleted items from all list endpoints.
  // Admin UIs can pass includeDeleted=true to see them.
  const includeDeleted = parseBoolean(query.includeDeleted);
  if (includeDeleted !== true) {
    filters.deletedAt = null;
  }

  const ids = parseCsvList(query.ids);
  if (ids.length > 0) {
    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (objectIds.length === 0) {
      return {
        items: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
    }
    filters._id = { $in: objectIds };
  }

  if (search) {
    const pattern = new RegExp(escapeRegExp(search), 'i');
    andConditions.push({
      $or: [{ title: pattern }, { overview: pattern }, { tags: pattern }]
    });
  }

  // Filter by actor/director slugs
  if (query.actorSlug) {
    const actor = await Person.findOne({ slug: query.actorSlug }).lean();
    if (actor) filters.actors = actor._id;
    else filters.actors = { $in: [] }; // No actor found, return no results
  }

  if (query.directorSlug) {
    const director = await Person.findOne({ slug: query.directorSlug }).lean();
    if (director) filters.directors = director._id;
    else filters.directors = { $in: [] }; // No director found, return no results
  }

  if (typeof query.genre === 'string' && query.genre.trim()) {
    const genreValue = query.genre.trim();
    let genreId = null;

    if (mongoose.Types.ObjectId.isValid(genreValue)) {
      genreId = genreValue;
    } else {
      const genreSlug = slugify(genreValue);
      const genreDoc = await Category.findOne({
        $or: [
          { slug: genreSlug },
          { name: new RegExp(`^${escapeRegExp(genreValue)}$`, 'i') }
        ]
      })
        .select('_id')
        .lean();

      genreId = genreDoc?._id || null;
    }

    // If the provided genre does not map to any known Category, return no results (instead of throwing a cast error).
    filters.genres = genreId ? genreId : { $in: [] };
  }

  if (typeof query.country === 'string' && query.country.trim()) {
    const countryValue = query.country.trim();
    let countryId = null;

    if (mongoose.Types.ObjectId.isValid(countryValue)) {
      countryId = countryValue;
    } else {
      const countrySlug = slugify(countryValue);
      const countryDoc = await Country.findOne({
        $or: [
          { slug: countrySlug },
          { name: new RegExp(`^${escapeRegExp(countryValue)}$`, 'i') }
        ]
      })
        .select('_id')
        .lean();

      countryId = countryDoc?._id || null;
    }

    filters.countries = countryId ? countryId : { $in: [] };
  }

  if (typeof query.quality === 'string' && query.quality.trim()) {
    const qualityValue = query.quality.trim();
    let qualityDoc = null;

    if (mongoose.Types.ObjectId.isValid(qualityValue)) {
      qualityDoc = await Quality.findById(qualityValue).select('_id name').lean();
    } else {
      const qualitySlug = slugify(qualityValue);
      qualityDoc = await Quality.findOne({
        $or: [
          { slug: qualitySlug },
          { name: new RegExp(`^${escapeRegExp(qualityValue)}$`, 'i') }
        ]
      })
        .select('_id name')
        .lean();
    }

    if (qualityDoc?._id) {
      andConditions.push({
        $or: [
          { qualityRef: qualityDoc._id },
          { quality: qualityDoc.name }
        ]
      });
    } else {
      filters.quality = qualityValue.toUpperCase();
    }
  }

  if (typeof query.type === 'string' && query.type.trim()) {
    const typeValue = query.type.trim();
    let formatDoc = null;

    if (mongoose.Types.ObjectId.isValid(typeValue)) {
      formatDoc = await Format.findById(typeValue).select('_id name slug').lean();
    } else {
      const formatSlug = slugify(typeValue);
      formatDoc = await Format.findOne({
        $or: [
          { slug: formatSlug },
          { name: new RegExp(`^${escapeRegExp(typeValue)}$`, 'i') }
        ]
      })
        .select('_id name slug')
        .lean();
    }

    if (formatDoc?._id) {
      andConditions.push({
        $or: [
          { formatRef: formatDoc._id },
          { type: formatDoc.slug || slugify(formatDoc.name) },
          { type: formatDoc.name }
        ]
      });
    } else {
      filters.type = typeValue.toLowerCase();
    }
  }

  if (typeof query.status === 'string' && query.status.trim()) {
    filters.status = query.status.trim().toLowerCase();
  }

  // Client lists should not see hidden items unless explicitly requested.
  const includeHidden = parseBoolean(query.includeHidden);
  if (includeHidden !== true) {
    if (filters.status === 'hidden') {
      delete filters.status;
    }
    filters.status = filters.status || { $ne: 'hidden' };
  }

  const tags = parseCsvList(query.tags);
  if (tags.length > 0) {
    filters.tags = { $in: tags };
  }

  const releaseYear = parseNumericFilter(query, 'releaseYear');
  if (releaseYear !== null) {
    filters.releaseYear = releaseYear;
  }

  const minImdb = parseNumericFilter(query, 'minImdb');
  const maxImdb = parseNumericFilter(query, 'maxImdb');
  if (minImdb !== null || maxImdb !== null) {
    filters.imdbRating = {};
    if (minImdb !== null) {
      filters.imdbRating.$gte = minImdb;
    }
    if (maxImdb !== null) {
      filters.imdbRating.$lte = maxImdb;
    }
  }

  const minRating = parseNumericFilter(query, 'minRating');
  const maxRating = parseNumericFilter(query, 'maxRating');
  if (minRating !== null || maxRating !== null) {
    filters.rating = {};
    if (minRating !== null) {
      filters.rating.$gte = minRating;
    }
    if (maxRating !== null) {
      filters.rating.$lte = maxRating;
    }
  }

  const featured = parseBoolean(query.featured);
  if (featured !== null) {
    filters.isFeatured = featured;
  }

  const trending = parseBoolean(query.trending);
  if (trending !== null) {
    filters.isTrending = trending;
  }

  const newRelease = parseBoolean(query.newRelease);
  if (newRelease !== null) {
    filters.isNewRelease = newRelease;
  }

  if (andConditions.length > 0) {
    filters.$and = andConditions;
  }

  const [items, total] = await Promise.all([
    Movie.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .populate('actors', 'name slug avatarUrl') // Added populate for actors
      .populate('directors', 'name slug avatarUrl') // Added populate for directors
      .lean(),
    Movie.countDocuments(filters)
  ]);

  return {
    items: items.map(mapMovieSummary),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNextPage: skip + items.length < total,
      hasPreviousPage: page > 1
    }
  };
}

async function createMovie(payload) {
  const title = payload.title.trim();
  const baseSlug = slugify(payload.slug || title);
  if (!baseSlug) {
    throw new HttpError(400, 'Invalid movie title');
  }

  let slug = baseSlug;
  let counter = 1;
  while (await Movie.exists({ slug })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  const [genres, countries, qualityDoc, formatDoc] = await Promise.all([
    resolveTaxonomyIds(Category, payload.genres !== undefined ? payload.genres : payload.genre),
    resolveTaxonomyIds(Country, payload.countries !== undefined ? payload.countries : payload.country),
    resolveTaxonomyRef(Quality, payload.qualityId !== undefined ? payload.qualityId : payload.quality || 'HD'),
    resolveTaxonomyRef(Format, payload.formatId !== undefined ? payload.formatId : payload.type || 'movie')
  ]);

  const movie = await Movie.create({
    title,
    slug,
    type: formatDoc?.slug || payload.type || 'movie',
    formatRef: formatDoc?._id || null,
    overview: payload.overview || '',
    genres,
    countries,
    releaseYear: payload.releaseYear,
    releaseDate: payload.releaseDate,
    rating: payload.rating === undefined ? 0 : payload.rating,
    imdbRating: payload.imdbRating === undefined ? payload.rating || 0 : payload.imdbRating,
    durationMinutes: payload.durationMinutes || 90,
    quality: qualityDoc?.name || payload.quality || 'HD',
    qualityRef: qualityDoc?._id || null,
    audioLanguage: payload.audioLanguage || payload.language || 'English',
    ageRating: payload.ageRating || 'PG-13',
    posterUrl: payload.posterUrl || '',
    backdropUrl: payload.backdropUrl || '',
    trailerUrl: payload.trailerUrl || '',
    streamUrl: payload.streamUrl || '',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    director: payload.director || '',
    accessMode: payload.accessMode || 'free',
    writers: Array.isArray(payload.writers) ? payload.writers : [],
    cast: Array.isArray(payload.cast) ? payload.cast : [],
    actors: Array.isArray(payload.actors) ? payload.actors : [],
    directors: Array.isArray(payload.directors) ? payload.directors : [],
    status: normalizeMovieStatus(payload.status) || 'released',
    isFeatured: Boolean(payload.isFeatured),
    isTrending: Boolean(payload.isTrending),
    isNewRelease: Boolean(payload.isNewRelease),
    views: payload.views || 0,
    trendingScore: payload.trendingScore || 0
  });

  return mapMovieSummary(movie);
}

async function getMovieBySlug(slug, options) {
  const shouldIncreaseViews = Boolean(options && options.increaseViews);
  const normalizedSlug = slugify(slug);
  const includeHidden = Boolean(options && options.includeHidden);

  if (!normalizedSlug) {
    throw new HttpError(400, 'Invalid movie identifier');
  }

  let movie;
  const query = {
    slug: normalizedSlug,
    deletedAt: null,
    ...(includeHidden ? {} : { status: { $ne: 'hidden' } }),
  };

  if (shouldIncreaseViews) {
    movie = await Movie.findOneAndUpdate(
      query,
      { $inc: { views: 1 } },
      { returnDocument: 'after' }
    )
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .populate('actors', 'name slug avatarUrl biography knownFor') // Added populate for actors
      .populate('directors', 'name slug avatarUrl biography knownFor') // Added populate for directors
      .lean();
  } else {
    movie = await Movie.findOne(query)
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .populate('actors', 'name slug avatarUrl biography knownFor') // Added populate for actors
      .populate('directors', 'name slug avatarUrl biography knownFor') // Added populate for directors
      .lean();
  }

  if (!movie) {
    throw new HttpError(404, 'Movie not found');
  }

  movie = await ensureMovieCredits(movie);

  return mapMovieDetail(movie);
}

async function getRelatedMovies(slug, limit = 6) {
  const movie = await Movie.findOne({ slug: slugify(slug) }).lean();
  if (!movie) {
    throw new HttpError(404, 'Movie not found');
  }

  const relatedFilters = {
    _id: { $ne: movie._id },
    deletedAt: null,
    status: 'released',
    $or: [{ genres: { $in: movie.genres } }, { countries: { $in: movie.countries } }]
  };

  let related = await Movie.find(relatedFilters)
    .sort({ imdbRating: -1, views: -1 })
    .limit(limit)
    .populate('genres', 'name slug')
    .populate('countries', 'name slug')
    .populate('qualityRef', 'name slug')
    .populate('formatRef', 'name slug')
    .lean();

  if (related.length < limit) {
    const fallback = await Movie.find({
      _id: { $nin: [movie._id, ...related.map((item) => item._id)] },
      status: 'released'
    })
      .sort({ imdbRating: -1, views: -1 })
      .limit(limit - related.length)
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .lean();

    related = [...related, ...fallback];
  }

  return related.map(mapMovieSummary);
}

async function listTopCountries(limit = 12) {
  const results = await Movie.aggregate([
    { $match: { deletedAt: null, status: { $ne: 'hidden' }, countries: { $exists: true, $ne: [] } } },
    { $unwind: '$countries' },
    { $group: { _id: '$countries', titles: { $sum: 1 } } },
    {
      $lookup: {
        from: 'countries',
        localField: '_id',
        foreignField: '_id',
        as: 'countryDoc'
      }
    },
    { $unwind: '$countryDoc' },
    { $sort: { titles: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        country: '$countryDoc.name',
        titles: 1
      }
    }
  ]);

  return results;
}

async function listTopGenres(limit = 12) {
  const results = await Movie.aggregate([
    { $match: { deletedAt: null, status: { $ne: 'hidden' }, genres: { $exists: true, $ne: [] } } },
    { $unwind: '$genres' },
    { $group: { _id: '$genres', titles: { $sum: 1 } } },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'genreDoc'
      }
    },
    { $unwind: '$genreDoc' },
    { $sort: { titles: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        genre: '$genreDoc.name',
        slug: '$genreDoc.slug',
        titles: 1
      }
    }
  ]);

  return results;
}

async function getHomeSections(options = {}) {
  const heroConfig = options && typeof options === 'object' ? options.hero : null;

  const [heroFeatured, trending, newReleases, recommended, topImdb] = await Promise.all([
    Movie.findOne({ deletedAt: null, status: { $ne: 'hidden' }, isFeatured: true })
      .sort({ trendingScore: -1, imdbRating: -1 })
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .lean(),
    Movie.find({ deletedAt: null, status: { $ne: 'hidden' }, isTrending: true })
      .sort({ trendingScore: -1, views: -1 })
      .limit(12)
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .lean(),
    Movie.find({ deletedAt: null, status: { $ne: 'hidden' }, isNewRelease: true })
      .sort({ releaseYear: -1, createdAt: -1 })
      .limit(12)
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .lean(),
    Movie.find({ deletedAt: null, status: 'released' })
      .sort({ views: -1, imdbRating: -1 })
      .limit(12)
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .lean(),
    Movie.find({ deletedAt: null, status: 'released' })
      .sort({ imdbRating: -1, views: -1 })
      .limit(12)
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .lean()
  ]);

  const defaultLimit = 6;
  const limit = (() => {
    const raw = Number(heroConfig && heroConfig.limit !== undefined ? heroConfig.limit : defaultLimit);
    if (!Number.isFinite(raw)) return defaultLimit;
    return Math.min(Math.max(Math.trunc(raw), 1), 12);
  })();
  const autofill = heroConfig && heroConfig.autofill === false ? false : true;

  const manualIds = Array.isArray(heroConfig && heroConfig.movieIds) ? heroConfig.movieIds : [];
  const manualIdStrings = manualIds
    .map((id) => String(id || ''))
    .map((id) => id.trim())
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

  const uniqueManualIds = [];
  const manualSeen = new Set();
  for (const id of manualIdStrings) {
    if (manualSeen.has(id)) continue;
    manualSeen.add(id);
    uniqueManualIds.push(id);
  }

  let heroSlides = [];
  if (uniqueManualIds.length > 0) {
    const manualMovies = await Movie.find({
      _id: { $in: uniqueManualIds },
      deletedAt: null,
      status: { $ne: 'hidden' }
    })
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .lean();

    const byId = new Map(manualMovies.map((m) => [m._id.toString(), m]));
    heroSlides = uniqueManualIds.map((id) => byId.get(id)).filter(Boolean);
  } else if (heroFeatured) {
    heroSlides = [heroFeatured];
  }

  if (heroSlides.length > limit) {
    heroSlides = heroSlides.slice(0, limit);
  }

  if (autofill && heroSlides.length < limit) {
    const excludeIds = heroSlides.map((m) => m._id);
    const remaining = Math.max(limit - heroSlides.length, 0);
    if (remaining > 0) {
      const fill = await Movie.find({
        deletedAt: null,
        status: 'released',
        ...(excludeIds.length > 0 ? { _id: { $nin: excludeIds } } : {})
      })
        .sort({ views: -1, imdbRating: -1, trendingScore: -1, createdAt: -1 })
        .limit(remaining)
        .populate('genres', 'name slug')
        .populate('countries', 'name slug')
        .populate('qualityRef', 'name slug')
        .populate('formatRef', 'name slug')
        .lean();

      heroSlides = [...heroSlides, ...fill];
    }
  }

  if (heroSlides.length === 0) {
    const fallbackHero = await Movie.findOne({ deletedAt: null, status: { $ne: 'hidden' } })
      .sort({ views: -1, imdbRating: -1, trendingScore: -1, createdAt: -1 })
      .populate('genres', 'name slug')
      .populate('countries', 'name slug')
      .populate('qualityRef', 'name slug')
      .populate('formatRef', 'name slug')
      .lean();
    if (fallbackHero) heroSlides = [fallbackHero];
  }

  const hero = heroSlides.length > 0 ? heroSlides[0] : null;

  return {
    hero: hero ? mapMovieDetail(hero) : null,
    heroSlides: heroSlides.map(mapMovieDetail),
    trending: trending.map(mapMovieSummary),
    newReleases: newReleases.map(mapMovieSummary),
    recommended: recommended.map(mapMovieSummary),
    topImdb: topImdb.map(mapMovieSummary)
  };
}

async function updateMovie(id, payload) {
  const updateData = { ...payload };
  delete updateData.qualityId;
  delete updateData.formatId;

  if (payload.title) {
    updateData.slug = slugify(payload.slug || payload.title);
  }

  if (payload.genres !== undefined || payload.genre !== undefined) {
    updateData.genres = await resolveTaxonomyIds(
      Category,
      payload.genres !== undefined ? payload.genres : payload.genre,
    );
  }

  if (payload.countries !== undefined || payload.country !== undefined) {
    updateData.countries = await resolveTaxonomyIds(
      Country,
      payload.countries !== undefined ? payload.countries : payload.country,
    );
  }

  if (payload.status !== undefined) {
    updateData.status = normalizeMovieStatus(payload.status) || 'released';
  }

  if (payload.language) {
    updateData.audioLanguage = payload.language;
  }

  if (payload.qualityId !== undefined || payload.quality !== undefined) {
    const qualityDoc = await resolveTaxonomyRef(
      Quality,
      payload.qualityId !== undefined ? payload.qualityId : payload.quality,
    );

    updateData.qualityRef = qualityDoc?._id || null;
    if (qualityDoc?.name) {
      updateData.quality = qualityDoc.name;
    }
  }

  if (payload.formatId !== undefined || payload.type !== undefined) {
    const formatDoc = await resolveTaxonomyRef(
      Format,
      payload.formatId !== undefined ? payload.formatId : payload.type,
    );

    updateData.formatRef = formatDoc?._id || null;
    if (formatDoc?.slug) {
      updateData.type = formatDoc.slug;
    }
  }

  const movie = await Movie.findByIdAndUpdate(id, updateData, { new: true })
    .populate('genres', 'name slug')
    .populate('countries', 'name slug')
    .populate('qualityRef', 'name slug')
    .populate('formatRef', 'name slug')
    .populate('actors', 'name slug avatarUrl biography knownFor') // Added populate for actors
    .populate('directors', 'name slug avatarUrl biography knownFor') // Added populate for directors
    .lean();

  if (!movie) throw new HttpError(404, 'Movie not found');
  return mapMovieDetail(movie);
}

async function deleteMovie(id) {
  const movie = await Movie.findById(id);
  if (!movie) throw new HttpError(404, 'Movie not found');

  if (!movie.deletedAt) {
    movie.deletedAt = new Date();
    await movie.save();
  }

  return { deleted: true };
}

async function restoreMovie(id) {
  const movie = await Movie.findById(id).lean();

  if (!movie) throw new HttpError(404, 'Movie not found');

  const updated = await Movie.findByIdAndUpdate(
    id,
    { $set: { deletedAt: null } },
    { new: true },
  )
    .populate('genres', 'name slug')
    .populate('countries', 'name slug')
    .populate('qualityRef', 'name slug')
    .populate('formatRef', 'name slug')
    .lean();

  return mapMovieDetail(updated);
}

module.exports = {
  listMovies,
  createMovie,
  getMovieBySlug,
  getRelatedMovies,
  listTopCountries,
  listTopGenres,
  getHomeSections,
  updateMovie,
  deleteMovie,
  restoreMovie
};
