const Episode = require('../models/episode.model');
const Movie = require('../models/movie.model');
const HttpError = require('../utils/http-error');
const slugify = require('../utils/slug');
const { escapeRegExp, parseBoolean, parsePagination, parseSearch, parseSort } = require('../utils/query');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function isObjectIdLike(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function parseDate(input) {
  if (input === undefined || input === null || input === '') return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapEpisode(item) {
  const movie = item.movie && typeof item.movie === 'object' ? item.movie : null;
  return {
    id: item._id.toString(),
    movieId: movie?._id ? movie._id.toString() : item.movie?.toString?.() || null,
    movieTitle: movie?.title,
    movieSlug: movie?.slug,
    epNo: item.epNo,
    title: item.title,
    overview: item.overview,
    durationSeconds: item.durationSeconds,
    status: item.status,
    streamUrl: item.streamUrl,
    airDate: item.airDate,
    createdAt: item.createdAt,
    deletedAt: item.deletedAt,
  };
}

function mapEpisodePublic(item) {
  return {
    id: item._id.toString(),
    movieId: item.movie?.toString?.() || null,
    epNo: item.epNo,
    title: item.title,
    durationSeconds: item.durationSeconds,
    status: item.status,
    streamUrl: item.streamUrl,
    airDate: item.airDate,
  };
}

async function listEpisodes(query) {
  const { page, limit, skip } = parsePagination(query, {
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    maxLimit: MAX_LIMIT,
  });

  const search = parseSearch(query);
  const sort = parseSort(query, {
    field: 'epNo',
    order: 1,
    allowedFields: ['epNo', 'createdAt', 'title', 'airDate', 'status'],
  });

  const filters = {};
  const andConditions = [];

  const includeDeleted = parseBoolean(query.includeDeleted);
  if (includeDeleted !== true) {
    filters.deletedAt = null;
  }

  const includeHidden = parseBoolean(query.includeHidden);
  if (includeHidden !== true) {
    if (filters.status === 'hidden') {
      delete filters.status;
    }
    filters.status = filters.status || { $ne: 'hidden' };
  }

  if (typeof query.movieId === 'string' && query.movieId.trim()) {
    const movieId = query.movieId.trim();
    if (!isObjectIdLike(movieId)) {
      throw new HttpError(400, 'Invalid movie identifier');
    }
    filters.movie = movieId;
  }

  if (typeof query.status === 'string' && query.status.trim()) {
    filters.status = query.status.trim().toLowerCase();
  }

  if (search) {
    const pattern = new RegExp(escapeRegExp(search), 'i');
    andConditions.push({ $or: [{ title: pattern }, { overview: pattern }] });
  }

  if (andConditions.length > 0) {
    filters.$and = andConditions;
  }

  const [items, total] = await Promise.all([
    Episode.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('movie', 'title slug deletedAt')
      .lean(),
    Episode.countDocuments(filters),
  ]);

  return {
    items: items.map(mapEpisode),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNextPage: skip + items.length < total,
      hasPreviousPage: page > 1,
    },
  };
}

async function listEpisodesByMovieSlug(slug, query) {
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) {
    throw new HttpError(400, 'Invalid movie identifier');
  }

  const movie = await Movie.findOne(
    { slug: normalizedSlug, deletedAt: null, status: { $ne: 'hidden' } },
    { _id: 1 },
  ).lean();
  if (!movie) throw new HttpError(404, 'Movie not found');

  // Public listing: only show published episodes, not deleted, not hidden.
  // Allow clients to pass limit (cap it) for series with many episodes.
  const rawLimit = Number.parseInt(query?.limit, 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 200;

  const items = await Episode.find({
    movie: movie._id,
    deletedAt: null,
    status: 'published',
  })
    .sort({ epNo: 1 })
    .limit(limit)
    .lean();

  return {
    items: items.map(mapEpisodePublic),
    meta: {
      total: items.length,
      limit,
    },
  };
}

async function createEpisode(payload) {
  const movieId = payload.movieId;
  if (!isObjectIdLike(movieId)) {
    throw new HttpError(400, 'Invalid movie identifier');
  }

  const movie = await Movie.findOne({ _id: movieId, deletedAt: null }).lean();
  if (!movie) {
    throw new HttpError(404, 'Movie not found');
  }

  const epNo = payload.epNo;
  if (typeof epNo !== 'number' || !Number.isFinite(epNo) || epNo < 1) {
    throw new HttpError(400, 'Invalid episode number');
  }

  const airDate = parseDate(payload.airDate);
  if (payload.airDate && !airDate) {
    throw new HttpError(400, 'Invalid airDate');
  }

  const episode = await Episode.create({
    movie: movieId,
    epNo,
    title: String(payload.title || '').trim(),
    overview: payload.overview || '',
    durationSeconds: typeof payload.durationSeconds === 'number' ? payload.durationSeconds : 0,
    status: payload.status || 'draft',
    streamUrl: payload.streamUrl || '',
    airDate,
  });

  const populated = await Episode.findById(episode._id).populate('movie', 'title slug').lean();
  return mapEpisode(populated || episode);
}

async function updateEpisode(id, payload) {
  if (!isObjectIdLike(id)) {
    throw new HttpError(400, 'Invalid episode identifier');
  }

  const updates = {};

  if (payload.movieId !== undefined) {
    if (!isObjectIdLike(payload.movieId)) {
      throw new HttpError(400, 'Invalid movie identifier');
    }
    const movie = await Movie.findOne({ _id: payload.movieId, deletedAt: null }).lean();
    if (!movie) throw new HttpError(404, 'Movie not found');
    updates.movie = payload.movieId;
  }

  if (payload.epNo !== undefined) {
    if (typeof payload.epNo !== 'number' || !Number.isFinite(payload.epNo) || payload.epNo < 1) {
      throw new HttpError(400, 'Invalid episode number');
    }
    updates.epNo = payload.epNo;
  }

  if (payload.title !== undefined) {
    const title = String(payload.title || '').trim();
    if (!title) throw new HttpError(400, 'Invalid episode title');
    updates.title = title;
  }

  if (payload.overview !== undefined) {
    updates.overview = String(payload.overview || '').trim();
  }

  if (payload.durationSeconds !== undefined) {
    if (typeof payload.durationSeconds !== 'number' || !Number.isFinite(payload.durationSeconds) || payload.durationSeconds < 0) {
      throw new HttpError(400, 'Invalid duration');
    }
    updates.durationSeconds = payload.durationSeconds;
  }

  if (payload.status !== undefined) {
    updates.status = String(payload.status || '').trim().toLowerCase();
  }

  if (payload.streamUrl !== undefined) {
    updates.streamUrl = String(payload.streamUrl || '').trim();
  }

  if (payload.airDate !== undefined) {
    const airDate = parseDate(payload.airDate);
    if (payload.airDate && !airDate) throw new HttpError(400, 'Invalid airDate');
    updates.airDate = airDate;
  }

  const updated = await Episode.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: updates },
    { returnDocument: 'after' },
  )
    .populate('movie', 'title slug')
    .lean();

  if (!updated) throw new HttpError(404, 'Episode not found');
  return mapEpisode(updated);
}

async function deleteEpisode(id) {
  if (!isObjectIdLike(id)) {
    throw new HttpError(400, 'Invalid episode identifier');
  }

  const updated = await Episode.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { returnDocument: 'after' },
  ).lean();

  if (!updated) throw new HttpError(404, 'Episode not found');
  return { id: updated._id.toString(), deletedAt: updated.deletedAt };
}

async function restoreEpisode(id) {
  if (!isObjectIdLike(id)) {
    throw new HttpError(400, 'Invalid episode identifier');
  }

  const updated = await Episode.findOneAndUpdate(
    { _id: id, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { returnDocument: 'after' },
  )
    .populate('movie', 'title slug')
    .lean();

  if (!updated) throw new HttpError(404, 'Episode not found');
  return mapEpisode(updated);
}

module.exports = {
  listEpisodes,
  listEpisodesByMovieSlug,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  restoreEpisode,
};
