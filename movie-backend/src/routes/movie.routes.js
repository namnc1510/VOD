const express = require('express');

const { createMovie, getMovieBySlug, listMovies, updateMovie, deleteMovie, restoreMovie } = require('../controllers/movie.controller');
const { streamMovie } = require('../controllers/stream.controller');
const { listMovieEpisodes } = require('../controllers/episode.controller');
const { importMovies, downloadTemplate } = require('../controllers/movie-import.controller');
const { createMovieComment, listMovieComments } = require('../controllers/comment.controller');
const authenticate = require('../middlewares/authenticate');
const authorizeRole = require('../middlewares/authorize-role');
const optionalAuthenticate = require('../middlewares/optional-authenticate');
const validateBody = require('../middlewares/validate-body');
const multer = require('multer');

const router = express.Router();

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Excel files are usually small; allow some headroom.
    fileSize: 20 * 1024 * 1024,
  },
});

const createMovieSchema = {
  title: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 160
  },
  overview: {
    required: false,
    type: 'string',
    maxLength: 5000
  },
  slug: {
    required: false,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  genre: {
    required: false,
    type: 'string',
    maxLength: 80
  },
  genres: {
    required: false,
    type: 'array',
    elementType: 'string',
    maxItems: 10
  },
  countries: {
    required: false,
    type: 'array',
    elementType: 'string',
    maxItems: 10
  },
  country: {
    required: false,
    type: 'string',
    maxLength: 80
  },
  releaseYear: {
    required: false,
    type: 'number',
    min: 1888,
    max: 2100
  },
  rating: {
    required: false,
    type: 'number',
    min: 0,
    max: 10
  },
  imdbRating: {
    required: false,
    type: 'number',
    min: 0,
    max: 10
  },
  durationMinutes: {
    required: false,
    type: 'number',
    min: 1,
    max: 1000
  },
  quality: {
    required: false,
    type: 'string',
    maxLength: 30
  },
  type: {
    required: false,
    type: 'string',
    maxLength: 30
  },
  status: {
    required: false,
    type: 'string',
    enum: ['released', 'coming_soon', 'hidden']
  },
  language: {
    required: false,
    type: 'string',
    maxLength: 60
  },
  ageRating: {
    required: false,
    type: 'string',
    maxLength: 20
  },
  posterUrl: {
    required: false,
    type: 'string',
    maxLength: 500
  },
  backdropUrl: {
    required: false,
    type: 'string',
    maxLength: 500
  },
  gallery: {
    required: false,
    type: 'array',
    elementType: 'string',
    maxItems: 50
  },
  trailerUrl: {
    required: false,
    type: 'string',
    maxLength: 500
  },
  streamUrl: {
    required: false,
    type: 'string',
    maxLength: 500
  },
  director: {
    required: false,
    type: 'string',
    maxLength: 120
  },
  writers: {
    required: false,
    type: 'array',
    elementType: 'string',
    maxItems: 20
  },
  cast: {
    required: false,
    type: 'array',
    elementType: 'string',
    maxItems: 50
  },
  tags: {
    required: false,
    type: 'array',
    elementType: 'string',
    maxItems: 30
  },
  isFeatured: {
    required: false,
    type: 'boolean'
  },
  isTrending: {
    required: false,
    type: 'boolean'
  },
  isNewRelease: {
    required: false,
    type: 'boolean'
  },
  views: {
    required: false,
    type: 'number',
    min: 0
  },
  trendingScore: {
    required: false,
    type: 'number',
    min: 0
  }
};

const createCommentSchema = {
  content: {
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 1000
  }
};

router.get('/', listMovies);
router.get('/import/template', authenticate, authorizeRole(['admin']), downloadTemplate);
router.post('/import', authenticate, authorizeRole(['admin']), importUpload.single('file'), importMovies);
router.post('/', authenticate, authorizeRole(['admin']), validateBody(createMovieSchema), createMovie);
router.put('/:id', authenticate, authorizeRole(['admin']), updateMovie);
router.delete('/:id', authenticate, authorizeRole(['admin']), deleteMovie);
router.post('/:id/restore', authenticate, authorizeRole(['admin']), restoreMovie);

router.get('/:slug/stream', optionalAuthenticate, streamMovie);
router.get('/:slug/episodes', listMovieEpisodes);
router.get('/:slug', optionalAuthenticate, getMovieBySlug);
router.get('/:slug/comments', listMovieComments);
router.post('/:slug/comments', authenticate, validateBody(createCommentSchema), createMovieComment);

module.exports = router;
