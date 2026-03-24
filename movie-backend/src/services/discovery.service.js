const Comment = require('../models/comment.model');
const Movie = require('../models/movie.model');
const Watchlist = require('../models/watchlist.model');
const Category = require('../models/category.model');
const Country = require('../models/country.model');
const Quality = require('../models/quality.model');
const Format = require('../models/format.model');
const movieService = require('./movie.service');
const settingService = require('./setting.service');

async function getHomeFeed(userId) {
  const settings = await settingService.getSettings();
  const [sections, genres, countries] = await Promise.all([
    movieService.getHomeSections({
      hero: {
        movieIds: settings?.homeHeroMovieIds || [],
        limit: settings?.homeHeroLimit,
        autofill: settings?.homeHeroAutofill
      }
    }),
    movieService.listTopGenres(12),
    movieService.listTopCountries(12)
  ]);

  let continueWatching = [];
  if (userId) {
    const watchlist = await Watchlist.find({ user: userId, progressSeconds: { $gt: 0 } })
      .sort({ updatedAt: -1 })
      .limit(10)
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

    continueWatching = watchlist
      .filter((item) => item.movie)
      .map((item) => ({
        progressSeconds: item.progressSeconds,
        isCompleted: item.isCompleted,
        lastWatchedAt: item.lastWatchedAt,
        movie: {
          id: item.movie._id.toString(),
          title: item.movie.title,
          slug: item.movie.slug,
          posterUrl: item.movie.posterUrl,
          backdropUrl: item.movie.backdropUrl,
          releaseYear: item.movie.releaseYear,
          genres: item.movie.genres ? item.movie.genres.map(g => typeof g === 'object' ? g.name : g) : [],
          durationMinutes: item.movie.durationMinutes,
          quality: item.movie.quality,
          imdbRating: item.movie.imdbRating
        }
      }));
  }

  return {
    ...sections,
    genres,
    countries,
    continueWatching
  };
}

async function getMovieLanding(slug, userId) {
  const movie = await movieService.getMovieBySlug(slug, { increaseViews: true });
  const movieId = movie.id;
  const [related, comments, commentsTotal] = await Promise.all([
    movieService.getRelatedMovies(slug, 8),
    Comment.find({
      movie: movieId,
      deletedAt: null,
      hidden: { $ne: true },
      $or: [{ status: 'approved' }, { status: { $exists: false } }]
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('user', 'name avatarUrl')
      .lean(),
    Comment.countDocuments({
      movie: movieId,
      deletedAt: null,
      hidden: { $ne: true },
      $or: [{ status: 'approved' }, { status: { $exists: false } }]
    })
  ]);

  let inWatchlist = false;
  if (userId) {
    const watchlistItem = await Watchlist.findOne({ user: userId, movie: movieId }).lean();
    inWatchlist = Boolean(watchlistItem);
  }

  return {
    movie,
    related,
    comments: {
      total: commentsTotal,
      items: comments.map((comment) => ({
        id: comment._id.toString(),
        content: comment.content,
        likesCount: comment.likesCount,
        createdAt: comment.createdAt,
        user: comment.user
          ? {
              id: comment.user._id ? comment.user._id.toString() : comment.user.toString(),
              name: comment.user.name,
              avatarUrl: comment.user.avatarUrl
            }
          : null
      }))
    },
    inWatchlist
  };
}

async function getCountriesCatalog(limit = 150) {
  return movieService.listTopCountries(limit);
}

async function getCatalogFilters() {
  const [genreIds, countryIds, years] = await Promise.all([
    Movie.distinct('genres', { deletedAt: null, status: { $ne: 'hidden' }, genres: { $exists: true, $ne: [] } }),
    Movie.distinct('countries', { deletedAt: null, status: { $ne: 'hidden' }, countries: { $exists: true, $ne: [] } }),
    Movie.distinct('releaseYear', { deletedAt: null, status: { $ne: 'hidden' }, releaseYear: { $exists: true, $ne: null } })
  ]);

  const [genres, countries, qualitiesDB, formatsDB] = await Promise.all([
    Category.find({ _id: { $in: genreIds } }).distinct('name'),
    Country.find({ _id: { $in: countryIds } }).distinct('name'),
    Quality.find({}).distinct('name'),
    Format.find({}).distinct('name')
  ]);

  return {
    genres: genres.filter(Boolean).sort((a, b) => a.localeCompare(b)),
    countries: countries.filter(Boolean).sort((a, b) => a.localeCompare(b)),
    years: years.filter((year) => Number.isFinite(year)).sort((a, b) => b - a),
    qualities: qualitiesDB.length > 0 ? qualitiesDB : ['SD', 'HD', '4K'],
    types: formatsDB.length > 0 ? formatsDB : ['movie', 'series'],
    statuses: ['released', 'coming_soon']
  };
}

module.exports = {
  getHomeFeed,
  getMovieLanding,
  getCountriesCatalog,
  getCatalogFilters
};
