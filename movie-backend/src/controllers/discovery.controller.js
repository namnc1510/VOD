const discoveryService = require('../services/discovery.service');
const { successResponse } = require('../utils/api-response');

async function getHomeFeed(req, res, next) {
  try {
    const userId = req.auth ? req.auth.userId : null;
    const data = await discoveryService.getHomeFeed(userId);
    return res.status(200).json(successResponse(data));
  } catch (error) {
    return next(error);
  }
}

async function getMovieLanding(req, res, next) {
  try {
    const userId = req.auth ? req.auth.userId : null;
    const data = await discoveryService.getMovieLanding(req.params.slug, userId);
    return res.status(200).json(successResponse(data));
  } catch (error) {
    return next(error);
  }
}

async function getCountriesCatalog(req, res, next) {
  try {
    const data = await discoveryService.getCountriesCatalog();
    return res.status(200).json(successResponse(data));
  } catch (error) {
    return next(error);
  }
}

async function getCatalogFilters(req, res, next) {
  try {
    const data = await discoveryService.getCatalogFilters();
    return res.status(200).json(successResponse(data));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHomeFeed,
  getMovieLanding,
  getCountriesCatalog,
  getCatalogFilters
};
