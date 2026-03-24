const mongoose = require('mongoose');

const Movie = require('../models/movie.model');
const Watchlist = require('../models/watchlist.model');
const HttpError = require('../utils/http-error');
const slugify = require('../utils/slug');

function mapWatchlistItem(item) {
  const movie = item.movie || {};

  return {
    id: item._id.toString(),
    progressSeconds: item.progressSeconds,
    isCompleted: item.isCompleted,
    lastWatchedAt: item.lastWatchedAt,
    addedAt: item.createdAt,
    movie: {
      id: movie._id ? movie._id.toString() : null,
      title: movie.title,
      slug: movie.slug,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      releaseYear: movie.releaseYear,
      genres: movie.genres ? movie.genres.map(g => typeof g === 'object' ? g.name : g) : [],
      durationMinutes: movie.durationMinutes,
      quality: movie.quality,
      imdbRating: movie.imdbRating
    }
  };
}

async function listWatchlist(userId) {
  const items = await Watchlist.find({ user: userId })
    .sort({ updatedAt: -1 })
    .populate({
      path: 'movie',
      select: 'title slug posterUrl backdropUrl releaseYear genres durationMinutes quality imdbRating',
      populate: {
        path: 'genres',
        select: 'name slug',
        model: 'Category'
      }
    })
    .lean();

  return items.filter((item) => Boolean(item && item.movie)).map(mapWatchlistItem);
}

async function upsertWatchlistItem(userId, payload) {
  let movieId = payload.movieId;

  if (!movieId && payload.movieSlug) {
    const movie = await Movie.findOne({ slug: slugify(payload.movieSlug) }, { _id: 1 }).lean();
    if (!movie) {
      throw new HttpError(404, 'Movie not found');
    }
    movieId = movie._id.toString();
  }

  if (!movieId || !mongoose.Types.ObjectId.isValid(movieId)) {
    throw new HttpError(400, 'Invalid movie identifier');
  }

  const movieExists = await Movie.exists({ _id: movieId });
  if (!movieExists) {
    throw new HttpError(404, 'Movie not found');
  }

  const progressSeconds = Math.max(0, Number(payload.progressSeconds) || 0);
  const isCompleted = Boolean(payload.isCompleted);
  const deviceTypeRaw = typeof payload.deviceType === 'string' ? payload.deviceType.trim().toLowerCase() : '';
  const deviceType = ['desktop', 'mobile', 'tv', 'unknown'].includes(deviceTypeRaw) ? deviceTypeRaw : 'unknown';

  const item = await Watchlist.findOneAndUpdate(
    { user: userId, movie: movieId },
    {
      $set: {
        progressSeconds,
        isCompleted,
        deviceType,
        lastWatchedAt: new Date()
      }
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )
    .populate({
      path: 'movie',
      select: 'title slug posterUrl backdropUrl releaseYear genres durationMinutes quality imdbRating',
      populate: {
        path: 'genres',
        select: 'name slug',
        model: 'Category'
      }
    })
    .lean();

  return mapWatchlistItem(item);
}

async function removeWatchlistItem(userId, movieId) {
  if (!mongoose.Types.ObjectId.isValid(movieId)) {
    throw new HttpError(400, 'Invalid movie identifier');
  }

  const result = await Watchlist.deleteOne({ user: userId, movie: movieId });
  if (result.deletedCount === 0) {
    throw new HttpError(404, 'Watchlist item not found');
  }
}

module.exports = {
  listWatchlist,
  upsertWatchlistItem,
  removeWatchlistItem
};
