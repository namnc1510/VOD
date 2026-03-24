const express = require('express');

const authenticate = require('../middlewares/authenticate');
const optionalAuthenticate = require('../middlewares/optional-authenticate');
const authorizeRole = require('../middlewares/authorize-role');
const validateBody = require('../middlewares/validate-body');
const { streamEpisode } = require('../controllers/stream.controller');
const {
  listEpisodes,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  restoreEpisode,
} = require('../controllers/episode.controller');

const router = express.Router();

const createEpisodeSchema = {
  movieId: {
    required: true,
    type: 'string',
    minLength: 24,
    maxLength: 24,
  },
  epNo: {
    required: true,
    type: 'number',
    min: 1,
    max: 100_000,
  },
  title: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200,
  },
  overview: {
    required: false,
    type: 'string',
    maxLength: 5000,
  },
  durationSeconds: {
    required: false,
    type: 'number',
    min: 0,
    max: 24 * 60 * 60,
  },
  status: {
    required: false,
    type: 'string',
    enum: ['published', 'draft', 'scheduled', 'hidden'],
  },
  streamUrl: {
    required: false,
    type: 'string',
    maxLength: 500,
  },
  airDate: {
    // Accept ISO strings; parsed in service.
    required: false,
    type: 'string',
    maxLength: 40,
  },
};

const updateEpisodeSchema = {
  movieId: {
    required: false,
    type: 'string',
    minLength: 24,
    maxLength: 24,
  },
  epNo: {
    required: false,
    type: 'number',
    min: 1,
    max: 100_000,
  },
  title: {
    required: false,
    type: 'string',
    minLength: 1,
    maxLength: 200,
  },
  overview: {
    required: false,
    type: 'string',
    maxLength: 5000,
  },
  durationSeconds: {
    required: false,
    type: 'number',
    min: 0,
    max: 24 * 60 * 60,
  },
  status: {
    required: false,
    type: 'string',
    enum: ['published', 'draft', 'scheduled', 'hidden'],
  },
  streamUrl: {
    required: false,
    type: 'string',
    maxLength: 500,
  },
  airDate: {
    required: false,
    type: 'string',
    maxLength: 40,
  },
};

// Public streaming endpoint for clients (only published + not hidden).
router.get('/:id/stream', optionalAuthenticate, streamEpisode);

router.use(authenticate, authorizeRole(['admin', 'super']));

router.get('/', listEpisodes);
router.post('/', validateBody(createEpisodeSchema), createEpisode);
router.put('/:id', validateBody(updateEpisodeSchema), updateEpisode);
router.delete('/:id', deleteEpisode);
router.post('/:id/restore', restoreEpisode);

module.exports = router;
