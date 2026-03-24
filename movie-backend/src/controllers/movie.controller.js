const movieService = require('../services/movie.service');
const User = require('../models/user.model');
const { successResponse } = require('../utils/api-response');

async function listMovies(req, res, next) {
  try {
    const result = await movieService.listMovies(req.query);
    return res.status(200).json(successResponse(result.items, result.meta));
  } catch (error) {
    return next(error);
  }
}

async function createMovie(req, res, next) {
  try {
    const movie = await movieService.createMovie(req.body);
    return res.status(201).json(successResponse(movie));
  } catch (error) {
    return next(error);
  }
}

async function getMovieBySlug(req, res, next) {
  try {
    const movie = await movieService.getMovieBySlug(req.params.slug);
    
    // Premium gating logic
    if (movie.accessMode && movie.accessMode !== 'free') {
      let authorized = false;
      if (req.auth && req.auth.userId) {
        const user = await User.findById(req.auth.userId).lean();
        if (user && (user.role === 'admin' || user.role === 'super')) {
          authorized = true;
        } else if (user) {
          const planHierarchy = { free: 0, standard: 1, premium: 2, ultimate: 3 };
          const userPlanRank = planHierarchy[user.plan] || 0;
          const reqPlanRank = planHierarchy[movie.accessMode] || 0;
          if (userPlanRank >= reqPlanRank) {
            authorized = true;
          }
        }
      }
      
      if (!authorized) {
        movie.streamUrl = '';
        movie.isPremiumLocked = true;
      }
    }

    return res.status(200).json(successResponse(movie));
  } catch (error) {
    return next(error);
  }
}

async function updateMovie(req, res, next) {
  try {
    const movie = await movieService.updateMovie(req.params.id, req.body);
    return res.status(200).json(successResponse(movie));
  } catch (error) {
    return next(error);
  }
}

async function deleteMovie(req, res, next) {
  try {
    const result = await movieService.deleteMovie(req.params.id);
    return res.status(200).json(successResponse(result));
  } catch (error) {
    return next(error);
  }
}

async function restoreMovie(req, res, next) {
  try {
    const movie = await movieService.restoreMovie(req.params.id);
    return res.status(200).json(successResponse(movie));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listMovies,
  createMovie,
  getMovieBySlug,
  updateMovie,
  deleteMovie,
  restoreMovie
};
