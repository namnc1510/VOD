const express = require('express');

const {
  getCatalogFilters,
  getCountriesCatalog,
  getHomeFeed,
  getMovieLanding
} = require('../controllers/discovery.controller');
const optionalAuthenticate = require('../middlewares/optional-authenticate');

const router = express.Router();

router.get('/home', optionalAuthenticate, getHomeFeed);
router.get('/filters', getCatalogFilters);
router.get('/countries', getCountriesCatalog);
router.get('/movies/:slug', optionalAuthenticate, getMovieLanding);

module.exports = router;
