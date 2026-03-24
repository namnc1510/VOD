const episodeService = require('../services/episode.service');
const { successResponse } = require('../utils/api-response');

async function listEpisodes(req, res, next) {
  try {
    const result = await episodeService.listEpisodes(req.query);
    return res.status(200).json(successResponse(result.items, result.meta));
  } catch (error) {
    return next(error);
  }
}

async function createEpisode(req, res, next) {
  try {
    const episode = await episodeService.createEpisode(req.body);
    return res.status(201).json(successResponse(episode));
  } catch (error) {
    return next(error);
  }
}

async function updateEpisode(req, res, next) {
  try {
    const episode = await episodeService.updateEpisode(req.params.id, req.body);
    return res.status(200).json(successResponse(episode));
  } catch (error) {
    return next(error);
  }
}

async function deleteEpisode(req, res, next) {
  try {
    const result = await episodeService.deleteEpisode(req.params.id);
    return res.status(200).json(successResponse(result));
  } catch (error) {
    return next(error);
  }
}

async function restoreEpisode(req, res, next) {
  try {
    const episode = await episodeService.restoreEpisode(req.params.id);
    return res.status(200).json(successResponse(episode));
  } catch (error) {
    return next(error);
  }
}

async function listMovieEpisodes(req, res, next) {
  try {
    const result = await episodeService.listEpisodesByMovieSlug(req.params.slug, req.query);
    return res.status(200).json(successResponse(result.items, result.meta));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listEpisodes,
  listMovieEpisodes,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  restoreEpisode,
};
