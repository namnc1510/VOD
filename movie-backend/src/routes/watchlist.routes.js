const express = require('express');

const { listWatchlist, removeWatchlistItem, upsertWatchlistItem } = require('../controllers/watchlist.controller');
const authenticate = require('../middlewares/authenticate');
const validateBody = require('../middlewares/validate-body');

const router = express.Router();

const watchlistSchema = {
  movieId: {
    required: false,
    type: 'string',
    minLength: 10,
    maxLength: 50
  },
  movieSlug: {
    required: false,
    type: 'string',
    minLength: 1,
    maxLength: 200
  },
  progressSeconds: {
    required: false,
    type: 'number',
    min: 0
  },
  isCompleted: {
    required: false,
    type: 'boolean'
  }
};

router.use(authenticate);

router.get('/', listWatchlist);
router.post('/', validateBody(watchlistSchema), upsertWatchlistItem);
router.patch('/:movieId', validateBody(watchlistSchema), upsertWatchlistItem);
router.delete('/:movieId', removeWatchlistItem);

module.exports = router;
